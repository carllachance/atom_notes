import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyAttachmentFile, formatFileSize, normalizeAttachment, summarizeSourceLocation } from '../attachments/attachmentModel';
import { chunkTextByLines } from '../attachments/attachmentProcessing';
import { addAttachmentsToNoteInScene, markAttachmentFailedInScene, markAttachmentProcessedInScene, retryAttachmentProcessingInScene } from '../attachments/attachmentActions';
import { SceneState } from '../types';

function baseScene(): SceneState {
  return {
    notes: [{
      id: 'note-1',
      title: 'One',
      body: 'Body',
      anchors: [],
      trace: 'idle',
      x: 0,
      y: 0,
      z: 1,
      createdAt: 1,
      updatedAt: 1,
      archived: false, deleted: false, deletedAt: null,
      projectIds: [],
      inferredProjectIds: [],
      workspaceId: null,
      attachments: []
    }],
    relationships: [],
    projects: [],
    workspaces: [],
    insightTimeline: [],
    isDragging: false,
    activeNoteId: 'note-1',
    expandedSecondarySurface: 'none',
    captureComposer: { draft: '', lastCreatedNoteId: null },
    focusMode: { highlight: true, isolate: false },
    aiPanel: { mode: 'ask', query: '', response: null, transcript: [], loading: false, communicationState: 'idle', interactionMode: 'live-stream' },
    lastCtrlTapTs: 0,
    lens: { kind: 'universe' },
    canvasScrollLeft: 0,
    canvasScrollTop: 0
  };
}

test('attachment helpers classify supported files and format provenance', () => {
  assert.equal(classifyAttachmentFile('scan.pdf', 'application/pdf'), 'pdf');
  assert.equal(classifyAttachmentFile('photo.png', 'image/png'), 'image');
  assert.equal(classifyAttachmentFile('notes.md', 'text/markdown'), 'markdown');
  assert.equal(classifyAttachmentFile('archive.zip', 'application/zip'), null);
  assert.equal(formatFileSize(1536), '1.5 KB');
  assert.equal(summarizeSourceLocation({ kind: 'page', label: 'Page 2', pageNumber: 2 }), 'Page 2');
});

test('chunkTextByLines preserves line-range provenance', () => {
  const chunks = chunkTextByLines(Array.from({ length: 30 }, (_, index) => `line ${index + 1}`).join('\n'), 12);
  assert.equal(chunks.length, 3);
  assert.deepEqual(chunks[0].sourceLocation, { kind: 'line_range', label: 'Lines 1-12', lineStart: 1, lineEnd: 12 });
  assert.match(chunks[2].text, /line 30/);
});

test('normalizeAttachment restores extraction state and chunks', () => {
  const attachment = normalizeAttachment({
    id: 'a1',
    name: 'report.pdf',
    mimeType: 'application/pdf',
    fileSize: 42,
    addedAt: 10,
    fileKind: 'pdf',
    rawFile: { dataUrl: 'data:application/pdf;base64,Zm9v', contentHash: 'hash', lastModified: 11 },
    processing: { status: 'processed', error: null, retryCount: 0, updatedAt: 12 },
    extraction: {
      method: 'native_text',
      extractedAt: 12,
      contentHash: 'hash',
      text: 'hello',
      chunks: [{ id: 'page-1', text: 'hello', sourceLocation: { kind: 'page', label: 'Page 1', pageNumber: 1 } }]
    }
  }, 0);

  assert.ok(attachment);
  assert.equal(attachment?.processing.status, 'processed');
  assert.equal(attachment?.extraction?.chunks[0].sourceLocation.pageNumber, 1);
});

test('attachment scene actions add, fail, retry, and store extraction separately', () => {
  const attachment = normalizeAttachment({
    id: 'a1',
    name: 'notes.txt',
    mimeType: 'text/plain',
    fileSize: 15,
    addedAt: 10,
    fileKind: 'text',
    rawFile: { dataUrl: 'data:text/plain;base64,aGVsbG8=', contentHash: 'hash-1', lastModified: 11 },
    processing: { status: 'uploaded', error: null, retryCount: 0, updatedAt: 10 }
  }, 0)!;

  const added = addAttachmentsToNoteInScene(baseScene(), 'note-1', [attachment]);
  assert.equal(added.notes[0].attachments?.length, 1);
  assert.equal(added.notes[0].attachments?.[0].rawFile.contentHash, 'hash-1');

  const failed = markAttachmentFailedInScene(added, 'note-1', 'a1', 'OCR unavailable');
  assert.equal(failed.notes[0].attachments?.[0].processing.status, 'failed');
  assert.equal(failed.notes[0].attachments?.[0].processing.error, 'OCR unavailable');

  const retried = retryAttachmentProcessingInScene(failed, 'note-1', 'a1');
  assert.equal(retried.notes[0].attachments?.[0].processing.status, 'uploaded');
  assert.equal(retried.notes[0].attachments?.[0].processing.retryCount, 1);

  const processed = markAttachmentProcessedInScene(retried, 'note-1', 'a1', {
    method: 'native_text',
    extractedAt: 20,
    contentHash: 'hash-1',
    text: 'hello world',
    chunks: [{ id: 'line-1', text: 'hello world', sourceLocation: { kind: 'line_range', label: 'Line 1', lineStart: 1, lineEnd: 1 } }]
  });

  assert.equal(processed.notes[0].attachments?.[0].processing.status, 'processed');
  assert.equal(processed.notes[0].attachments?.[0].extraction?.text, 'hello world');
  assert.equal(processed.notes[0].attachments?.[0].rawFile.dataUrl, 'data:text/plain;base64,aGVsbG8=');
});
