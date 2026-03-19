import { now } from '../notes/noteModel';
import { SceneState, NoteAttachment, AttachmentExtractionResult } from '../types';
import { refreshInferredRelationships } from '../relationshipLogic';

function updateAttachments(scene: SceneState, noteId: string, updater: (attachments: NoteAttachment[]) => NoteAttachment[]) {
  const timestamp = now();
  const notes = scene.notes.map((note) => {
    if (note.id !== noteId) return note;
    const attachments = updater(note.attachments ?? []);
    return { ...note, attachments, updatedAt: timestamp };
  });

  return { ...scene, notes, relationships: refreshInferredRelationships(notes, scene.relationships, timestamp) };
}

export function addAttachmentsToNoteInScene(scene: SceneState, noteId: string, attachments: NoteAttachment[]) {
  return updateAttachments(scene, noteId, (current) => [...current, ...attachments]);
}

export function removeAttachmentFromNoteInScene(scene: SceneState, noteId: string, attachmentId: string) {
  return updateAttachments(scene, noteId, (current) => current.filter((attachment) => attachment.id !== attachmentId));
}

export function markAttachmentProcessingInScene(scene: SceneState, noteId: string, attachmentId: string) {
  return updateAttachments(scene, noteId, (current) => current.map((attachment) => attachment.id === attachmentId
    ? {
        ...attachment,
        processing: {
          ...attachment.processing,
          status: 'processing',
          error: null,
          updatedAt: now()
        }
      }
    : attachment));
}

export function markAttachmentProcessedInScene(scene: SceneState, noteId: string, attachmentId: string, extraction: AttachmentExtractionResult) {
  return updateAttachments(scene, noteId, (current) => current.map((attachment) => attachment.id === attachmentId
    ? {
        ...attachment,
        processing: {
          ...attachment.processing,
          status: 'processed',
          error: null,
          updatedAt: now()
        },
        extraction
      }
    : attachment));
}

export function markAttachmentFailedInScene(scene: SceneState, noteId: string, attachmentId: string, error: string) {
  return updateAttachments(scene, noteId, (current) => current.map((attachment) => attachment.id === attachmentId
    ? {
        ...attachment,
        processing: {
          ...attachment.processing,
          status: 'failed',
          error,
          updatedAt: now()
        }
      }
    : attachment));
}

export function retryAttachmentProcessingInScene(scene: SceneState, noteId: string, attachmentId: string) {
  return updateAttachments(scene, noteId, (current) => current.map((attachment) => attachment.id === attachmentId
    ? {
        ...attachment,
        processing: {
          status: 'uploaded',
          error: null,
          retryCount: attachment.processing.retryCount + 1,
          updatedAt: now()
        }
      }
    : attachment));
}
