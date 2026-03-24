/**
 * Regression tests for DG-4 privacy/export/import cleanup (PR 71 cleanup)
 *
 * Tests cover:
 * - Export privacy filtering (includeExternalReferences enforcement)
 * - privacyMode metadata derivation
 * - Canvas scroll position preservation on import
 * - Full scene import API
 * - Note deduplication by content hash
 * - Provenance normalization
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  derivePrivacyMode,
  exportSceneToJson,
  filterNoteForExport,
  filterProvenanceForExport,
  filterDuplicateNotes,
  importSceneFromJson,
  DEFAULT_PRIVACY_OPTIONS,
  FULL_PRIVACY_OPTIONS,
  MINIMAL_PRIVACY_OPTIONS
} from '../scene/dataMigration';
import { NoteCardModel, NoteProvenance, SceneState } from '../types';

// Helper to create a test note
function createTestNote(overrides: Partial<NoteCardModel> = {}): NoteCardModel {
  return {
    id: 'test-note-1',
    title: 'Test Note',
    body: 'Test body content',
    anchors: [],
    trace: 'idle',
    x: 100,
    y: 100,
    z: 1,
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
    archived: false,
    deleted: false,
    deletedAt: null,
    inFocus: false,
    isFocus: false,
    projectIds: [],
    inferredProjectIds: [],
    workspaceId: null,
    ...overrides
  };
}

// Helper to create test provenance
function createTestProvenance(overrides: Partial<NoteProvenance> = {}): NoteProvenance {
  return {
    origin: 'manual',
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
    externalReferences: [
      {
        id: 'ref-1',
        kind: 'url',
        label: 'Example',
        value: 'https://example.com',
        confidence: 0.9,
        isInferred: false,
        createdAt: 1700000000000
      },
      {
        id: 'ref-2',
        kind: 'citation',
        label: 'Paper',
        value: 'arxiv:1234.5678',
        confidence: 0.8,
        isInferred: true,
        createdAt: 1700000000000
      }
    ],
    aiSessionId: 'session-123',
    ...overrides
  };
}

// Helper to create test scene
function createTestScene(overrides: Partial<SceneState> = {}): SceneState {
  const note = createTestNote({ provenance: createTestProvenance() });
  return {
    notes: [note],
    relationships: [],
    projects: [],
    workspaces: [],
    insightTimeline: [],
    isDragging: false,
    activeNoteId: null,
    expandedSecondarySurface: 'none',
    captureComposer: { draft: '', lastCreatedNoteId: null },
    focusMode: { highlight: true, isolate: false },
    aiPanel: {
      mode: 'ask',
      query: '',
      response: null,
      transcript: [],
      loading: false,
      communicationState: 'idle',
      interactionMode: 'live-stream'
    },
    lastCtrlTapTs: 0,
    lens: { kind: 'universe' },
    canvasScrollLeft: 150,
    canvasScrollTop: 200,
    ...overrides
  };
}

// ============================================================================
// Privacy Mode Derivation Tests
// ============================================================================

test('derivePrivacyMode returns "full" when no redaction flags are set', () => {
  const mode = derivePrivacyMode(FULL_PRIVACY_OPTIONS);
  assert.strictEqual(mode, 'full');
});

test('derivePrivacyMode returns "redacted" when timestamps are redacted', () => {
  const mode = derivePrivacyMode({
    ...FULL_PRIVACY_OPTIONS,
    redactTimestamps: true
  });
  assert.strictEqual(mode, 'redacted');
});

test('derivePrivacyMode returns "redacted" when AI session IDs are redacted', () => {
  const mode = derivePrivacyMode({
    ...FULL_PRIVACY_OPTIONS,
    redactAiSessionIds: true
  });
  assert.strictEqual(mode, 'redacted');
});

test('derivePrivacyMode returns "minimal" when provenance and references are excluded', () => {
  const mode = derivePrivacyMode(MINIMAL_PRIVACY_OPTIONS);
  assert.strictEqual(mode, 'minimal');
});

// ============================================================================
// Provenance Filtering Tests
// ============================================================================

test('filterProvenanceForExport returns undefined when includeProvenance is false', () => {
  const provenance = createTestProvenance();
  const result = filterProvenanceForExport(provenance, {
    ...DEFAULT_PRIVACY_OPTIONS,
    includeProvenance: false
  });
  assert.strictEqual(result, undefined);
});

test('filterProvenanceForExport keeps provenance but strips external references when includeExternalReferences is false', () => {
  const provenance = createTestProvenance();
  const result = filterProvenanceForExport(provenance, {
    ...DEFAULT_PRIVACY_OPTIONS,
    includeExternalReferences: false
  });

  assert.notStrictEqual(result, undefined);
  assert.ok(result);
  assert.deepStrictEqual(result!.externalReferences, []);
  // Origin and other fields should be preserved
  assert.strictEqual(result!.origin, 'manual');
});

test('filterProvenanceForExport redacts timestamps when redactTimestamps is true', () => {
  const provenance = createTestProvenance();
  const result = filterProvenanceForExport(provenance, {
    ...DEFAULT_PRIVACY_OPTIONS,
    redactTimestamps: true
  });

  assert.ok(result);
  assert.strictEqual(result!.createdAt, 0);
  assert.strictEqual(result!.updatedAt, 0);
});

test('filterProvenanceForExport redacts AI session ID when redactAiSessionIds is true', () => {
  const provenance = createTestProvenance({ aiSessionId: 'session-123' });
  const result = filterProvenanceForExport(provenance, {
    ...DEFAULT_PRIVACY_OPTIONS,
    redactAiSessionIds: true
  });

  assert.ok(result);
  assert.strictEqual(result!.aiSessionId, undefined);
});

test('filterProvenanceForExport preserves external references when includeExternalReferences is true', () => {
  const provenance = createTestProvenance();
  const result = filterProvenanceForExport(provenance, DEFAULT_PRIVACY_OPTIONS);

  assert.ok(result);
  assert.strictEqual(result!.externalReferences.length, 2);
});

// ============================================================================
// Note Filtering Tests
// ============================================================================

test('filterNoteForExport filters provenance according to options', () => {
  const note = createTestNote({ provenance: createTestProvenance() });
  const filtered = filterNoteForExport(note, {
    ...DEFAULT_PRIVACY_OPTIONS,
    includeExternalReferences: false
  });

  assert.ok(filtered.provenance);
  assert.deepStrictEqual(filtered.provenance!.externalReferences, []);
});

test('filterNoteForExport redacts note timestamps when redactTimestamps is true', () => {
  const note = createTestNote({ createdAt: 1700000000000, updatedAt: 1700000000000 });
  const filtered = filterNoteForExport(note, {
    ...DEFAULT_PRIVACY_OPTIONS,
    redactTimestamps: true
  });

  assert.strictEqual(filtered.createdAt, 0);
  assert.strictEqual(filtered.updatedAt, 0);
});

test('filterNoteForExport removes attachments when includeAttachments is false', () => {
  const note = createTestNote({
    attachments: [
      {
        id: 'att-1',
        name: 'file.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024,
        addedAt: 1700000000000,
        fileKind: 'pdf',
        rawFile: { dataUrl: 'data:...', contentHash: 'abc', lastModified: 1700000000000 },
        processing: { status: 'processed', error: null, retryCount: 0, updatedAt: 1700000000000 },
        extraction: null
      }
    ]
  });

  const filtered = filterNoteForExport(note, {
    ...DEFAULT_PRIVACY_OPTIONS,
    includeAttachments: false
  });

  assert.deepStrictEqual(filtered.attachments, []);
});

// ============================================================================
// Export Tests
// ============================================================================

test('exportSceneToJson emits privacyMode "minimal" for minimal exports', () => {
  const scene = createTestScene();
  const json = exportSceneToJson(scene, MINIMAL_PRIVACY_OPTIONS);
  const parsed = JSON.parse(json);

  assert.strictEqual(parsed.metadata.privacyMode, 'minimal');
});

test('exportSceneToJson emits privacyMode "full" for full exports', () => {
  const scene = createTestScene();
  const json = exportSceneToJson(scene, FULL_PRIVACY_OPTIONS);
  const parsed = JSON.parse(json);

  assert.strictEqual(parsed.metadata.privacyMode, 'full');
});

test('exportSceneToJson includes provenance when includeProvenance is true', () => {
  const scene = createTestScene();
  const json = exportSceneToJson(scene, DEFAULT_PRIVACY_OPTIONS);
  const parsed = JSON.parse(json);

  assert.ok(parsed.scene.notes[0].provenance);
  assert.strictEqual(parsed.scene.notes[0].provenance.origin, 'manual');
});

test('exportSceneToJson strips external references when includeExternalReferences is false', () => {
  const scene = createTestScene();
  const options = { ...DEFAULT_PRIVACY_OPTIONS, includeExternalReferences: false };
  const json = exportSceneToJson(scene, options);
  const parsed = JSON.parse(json);

  assert.ok(parsed.scene.notes[0].provenance);
  assert.deepStrictEqual(parsed.scene.notes[0].provenance.externalReferences, []);
});

test('exportSceneToJson strips provenance entirely when includeProvenance is false', () => {
  const scene = createTestScene();
  const options = { ...DEFAULT_PRIVACY_OPTIONS, includeProvenance: false };
  const json = exportSceneToJson(scene, options);
  const parsed = JSON.parse(json);

  assert.strictEqual(parsed.scene.notes[0].provenance, undefined);
});

test('exportSceneToJson includes correct includesExternalReferences in metadata', () => {
  const scene = createTestScene();

  const withRefs = exportSceneToJson(scene, DEFAULT_PRIVACY_OPTIONS);
  const parsedWith = JSON.parse(withRefs);
  assert.strictEqual(parsedWith.metadata.includesExternalReferences, true);

  const withoutRefs = exportSceneToJson(scene, {
    ...DEFAULT_PRIVACY_OPTIONS,
    includeExternalReferences: false
  });
  const parsedWithout = JSON.parse(withoutRefs);
  assert.strictEqual(parsedWithout.metadata.includesExternalReferences, false);
});

// ============================================================================
// Import Tests
// ============================================================================

test('importSceneFromJson preserves canvas scroll position from import', () => {
  const originalScene = createTestScene({
    canvasScrollLeft: 500,
    canvasScrollTop: 750
  });

  const json = JSON.stringify({
    metadata: { version: '1.0.0', exportedAt: Date.now(), schemaVersion: 1, includesAttachments: true, includesAiTranscript: true, includesExternalReferences: true, privacyMode: 'full' },
    scene: originalScene
  });

  const { scene } = importSceneFromJson(json);

  assert.strictEqual(scene.canvasScrollLeft, 500);
  assert.strictEqual(scene.canvasScrollTop, 750);
});

test('importSceneFromJson defaults to 0 for missing scroll positions', () => {
  const sceneData = {
    notes: [],
    relationships: [],
    projects: [],
    workspaces: []
  };

  const json = JSON.stringify({ scene: sceneData });
  const { scene } = importSceneFromJson(json);

  assert.strictEqual(scene.canvasScrollLeft, 0);
  assert.strictEqual(scene.canvasScrollTop, 0);
});

test('importSceneFromJson normalizes notes with provenance', () => {
  const sceneData = {
    notes: [
      {
        id: 'note-1',
        title: 'Imported Note',
        body: 'Content',
        provenance: {
          origin: 'imported',
          externalReferences: [{ id: 'ref-1', kind: 'url', label: 'Test', value: 'https://test.com', confidence: 0.9, isInferred: false, createdAt: 1700000000000 }]
        }
      }
    ],
    relationships: [],
    projects: [],
    workspaces: []
  };

  const json = JSON.stringify({ scene: sceneData });
  const { scene } = importSceneFromJson(json);

  assert.strictEqual(scene.notes.length, 1);
  assert.ok(scene.notes[0].provenance);
  assert.strictEqual(scene.notes[0].provenance!.origin, 'imported');
  assert.strictEqual(scene.notes[0].provenance!.externalReferences.length, 1);
});

// ============================================================================
// Duplicate Detection Tests
// ============================================================================

test('filterDuplicateNotes filters notes with identical title and body', () => {
  const existing: NoteCardModel[] = [
    createTestNote({ id: 'existing-1', title: 'Same Title', body: 'Same Body' })
  ];

  const newNotes: NoteCardModel[] = [
    createTestNote({ id: 'new-1', title: 'Same Title', body: 'Same Body' }),
    createTestNote({ id: 'new-2', title: 'Different Title', body: 'Different Body' })
  ];

  const filtered = filterDuplicateNotes(newNotes, existing);

  assert.strictEqual(filtered.length, 1);
  assert.strictEqual(filtered[0].id, 'new-2');
});

test('filterDuplicateNotes keeps notes with same title but different body', () => {
  const existing: NoteCardModel[] = [
    createTestNote({ id: 'existing-1', title: 'Same Title', body: 'Original Body' })
  ];

  const newNotes: NoteCardModel[] = [
    createTestNote({ id: 'new-1', title: 'Same Title', body: 'Different Body' })
  ];

  const filtered = filterDuplicateNotes(newNotes, existing);

  assert.strictEqual(filtered.length, 1);
  assert.strictEqual(filtered[0].body, 'Different Body');
});

test('filterDuplicateNotes handles null titles correctly', () => {
  const existing: NoteCardModel[] = [
    createTestNote({ id: 'existing-1', title: null, body: 'Body' })
  ];

  const newNotes: NoteCardModel[] = [
    createTestNote({ id: 'new-1', title: null, body: 'Body' }),
    createTestNote({ id: 'new-2', title: 'Some Title', body: 'Body' })
  ];

  const filtered = filterDuplicateNotes(newNotes, existing);

  assert.strictEqual(filtered.length, 1);
  assert.strictEqual(filtered[0].id, 'new-2');
});

test('filterDuplicateNotes returns all new notes when no existing notes', () => {
  const newNotes: NoteCardModel[] = [
    createTestNote({ id: 'new-1' }),
    createTestNote({ id: 'new-2' })
  ];

  const filtered = filterDuplicateNotes(newNotes, []);

  assert.strictEqual(filtered.length, 2);
});

// ============================================================================
// Provenance Normalization Tests (via import)
// ============================================================================

test('provenance normalization normalizes malformed provenance safely', () => {
  const sceneData = {
    notes: [
      {
        id: 'note-1',
        title: 'Test',
        body: 'Content',
        provenance: {
          // Missing required fields, invalid origin
          invalidField: 'junk',
          origin: 'invalid-origin'
        }
      }
    ],
    relationships: [],
    projects: [],
    workspaces: []
  };

  const json = JSON.stringify({ scene: sceneData });
  const { scene } = importSceneFromJson(json);

  // Should normalize to default values without crashing
  assert.ok(scene.notes[0].provenance);
  assert.strictEqual(scene.notes[0].provenance!.origin, 'manual');
});

test('provenance normalization normalizes external references with invalid kinds', () => {
  const sceneData = {
    notes: [
      {
        id: 'note-1',
        title: 'Test',
        body: 'Content',
        provenance: {
          origin: 'manual',
          externalReferences: [
            { id: 'ref-1', kind: 'invalid-kind', label: 'Test', value: 'test', confidence: 1.5, isInferred: false, createdAt: 1700000000000 },
            { id: 'ref-2', kind: 'url', label: 'Valid', value: 'https://valid.com', confidence: 0.8, isInferred: false, createdAt: 1700000000000 }
          ]
        }
      }
    ],
    relationships: [],
    projects: [],
    workspaces: []
  };

  const json = JSON.stringify({ scene: sceneData });
  const { scene } = importSceneFromJson(json);

  // Invalid kind should default to 'url', confidence should be clamped
  const refs = scene.notes[0].provenance!.externalReferences;
  assert.strictEqual(refs.length, 2);
  assert.strictEqual(refs[0].kind, 'url'); // Defaulted from invalid
  assert.strictEqual(refs[0].confidence, 1.0); // Clamped to 1.0
});
