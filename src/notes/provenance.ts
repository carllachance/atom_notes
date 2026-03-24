/**
 * Provenance utilities for source tracking (EPIC-006)
 *
 * Storage strategy:
 * - Primary source of truth: Provenance is stored inside NoteCardModel.provenance
 *   and persists with the scene via sceneStorage.ts
 * - Secondary index: This module provides a separate localStorage index
 *   (atom-notes.provenance.v1) for fast lookup by note ID
 *
 * The separate storage exists to support:
 * 1. Quick provenance lookups without parsing full scene
 * 2. Provenance-only operations (batch updates, analytics)
 *
 * When in doubt, prefer the scene-based storage as the source of truth.
 */
import { ExternalReference, ExternalReferenceKind, NoteProvenance, NoteSourceOrigin } from '../types';
import { now } from './noteModel';

const PROVENANCE_STORAGE_KEY = 'atom-notes.provenance.v1';

/**
 * Create a new external reference (EPIC-006)
 */
export function createExternalReference(
  kind: ExternalReferenceKind,
  value: string,
  label?: string,
  options?: {
    metadata?: Record<string, string>;
    confidence?: number;
    isInferred?: boolean;
  }
): ExternalReference {
  return {
    id: crypto.randomUUID(),
    kind,
    label: label ?? value,
    value,
    metadata: options?.metadata,
    confidence: options?.confidence ?? 0.8,
    isInferred: options?.isInferred ?? false,
    createdAt: now()
  };
}

/**
 * Add an external reference to provenance (EPIC-006)
 */
export function addExternalReference(
  provenance: NoteProvenance,
  reference: ExternalReference
): NoteProvenance {
  return {
    ...provenance,
    externalReferences: [...provenance.externalReferences, reference],
    updatedAt: now()
  };
}

/**
 * Remove an external reference from provenance (EPIC-006)
 */
export function removeExternalReference(
  provenance: NoteProvenance,
  referenceId: string
): NoteProvenance {
  return {
    ...provenance,
    externalReferences: provenance.externalReferences.filter((ref) => ref.id !== referenceId),
    updatedAt: now()
  };
}

/**
 * Update provenance origin (EPIC-006)
 */
export function updateProvenanceOrigin(
  provenance: NoteProvenance,
  origin: NoteSourceOrigin
): NoteProvenance {
  return {
    ...provenance,
    origin,
    updatedAt: now()
  };
}

/**
 * Mark provenance as derived from another note (EPIC-006)
 */
export function markProvenanceDerivedFrom(
  provenance: NoteProvenance,
  sourceNoteId: string
): NoteProvenance {
  return {
    ...provenance,
    derivedFromNoteId: sourceNoteId,
    updatedAt: now()
  };
}

/**
 * Set AI session ID on provenance (EPIC-006)
 */
export function setProvenanceAiSession(
  provenance: NoteProvenance,
  sessionId: string
): NoteProvenance {
  return {
    ...provenance,
    aiSessionId: sessionId,
    updatedAt: now()
  };
}

/**
 * Generate content hash for integrity verification (EPIC-006)
 *
 * NOTE: This is a non-cryptographic hash for integrity verification and
 * duplicate detection purposes. Do not use for security-critical verification.
 * For stronger integrity verification, use crypto.subtle.digest in production.
 */
export function generateContentHash(content: string): string {
  // Non-cryptographic hash for demo/dedup purposes
  // For stronger integrity verification, use crypto.subtle.digest in production
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Set content hash on provenance (EPIC-006)
 */
export function setProvenanceContentHash(
  provenance: NoteProvenance,
  content: string
): NoteProvenance {
  return {
    ...provenance,
    contentHash: generateContentHash(content),
    updatedAt: now()
  };
}

/**
 * Verify content integrity using stored hash (EPIC-006)
 */
export function verifyContentIntegrity(content: string, provenance: NoteProvenance): boolean {
  if (!provenance.contentHash) return true; // No hash stored, assume valid
  return generateContentHash(content) === provenance.contentHash;
}

/**
 * Extract URLs from text content (EPIC-006)
 */
export function extractUrlsFromText(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>"\]]+/g;
  const matches = text.match(urlRegex);
  return matches ? [...new Set(matches)] : [];
}

/**
 * Create provenance for quick capture (EPIC-006)
 */
export function createQuickCaptureProvenance(): NoteProvenance {
  return {
    origin: 'quick-capture',
    createdAt: now(),
    updatedAt: now(),
    externalReferences: []
  };
}

/**
 * Create provenance for clipboard paste (EPIC-006)
 */
export function createClipboardPasteProvenance(): NoteProvenance {
  return {
    origin: 'clipboard-paste',
    createdAt: now(),
    updatedAt: now(),
    externalReferences: []
  };
}

/**
 * Create provenance for file import (EPIC-006)
 */
export function createFileImportProvenance(fileName?: string): NoteProvenance {
  const t = now();
  const refs: ExternalReference[] = fileName
    ? [{
        id: crypto.randomUUID(),
        kind: 'file' as const,
        label: fileName,
        value: fileName,
        confidence: 1.0,
        isInferred: false,
        createdAt: t
      }]
    : [];

  return {
    origin: 'file-import',
    createdAt: t,
    updatedAt: t,
    externalReferences: refs
  };
}

/**
 * Create provenance for AI-generated content (EPIC-006)
 */
export function createAiGeneratedProvenance(sessionId?: string): NoteProvenance {
  return {
    origin: 'ai-generated',
    createdAt: now(),
    updatedAt: now(),
    externalReferences: [],
    aiSessionId: sessionId
  };
}

/**
 * Persist provenance data for backup (EPIC-006)
 */
export function persistProvenanceData(noteId: string, provenance: NoteProvenance): void {
  const stored = getStoredProvenanceData();
  stored[noteId] = provenance;
  localStorage.setItem(PROVENANCE_STORAGE_KEY, JSON.stringify(stored));
}

/**
 * Retrieve stored provenance data (EPIC-006)
 */
export function getStoredProvenanceData(): Record<string, NoteProvenance> {
  try {
    const raw = localStorage.getItem(PROVENANCE_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, NoteProvenance>;
  } catch {
    return {};
  }
}

/**
 * Get provenance for a specific note from storage (EPIC-006)
 */
export function getStoredProvenance(noteId: string): NoteProvenance | null {
  const stored = getStoredProvenanceData();
  return stored[noteId] ?? null;
}

/**
 * Clear stored provenance data (EPIC-006)
 */
export function clearStoredProvenance(): void {
  localStorage.removeItem(PROVENANCE_STORAGE_KEY);
}
