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
import { ExternalReference, ExternalReferenceKind, NoteCardModel, NoteProvenance, NoteSourceOrigin, SourceBreakType, SourceHealthStatus } from '../types';

const now = () => Date.now();

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
  return evaluateExternalReferenceHealth({
    id: crypto.randomUUID(),
    kind,
    label: label ?? value,
    value,
    metadata: options?.metadata,
    confidence: options?.confidence ?? 0.8,
    isInferred: options?.isInferred ?? false,
    accessStatus: 'unknown',
    identityStatus: 'unknown',
    meaningStatus: 'unknown',
    lastCheckedAt: now(),
    createdAt: now()
  });
}

export function evaluateExternalReferenceHealth(reference: ExternalReference): ExternalReference {
  const hasAccessBreak = reference.accessStatus === 'missing' || reference.accessStatus === 'restricted';
  const hasIdentityBreak = reference.identityStatus === 'mismatch';
  const hasMeaningBreak = reference.meaningStatus === 'drifted';
  const isRegrounded =
    Boolean(reference.orphanedAt || reference.regroundedFromReferenceId) &&
    reference.accessStatus === 'reachable' &&
    reference.identityStatus === 'verified' &&
    reference.meaningStatus !== 'drifted';

  let sourceHealth: SourceHealthStatus;
  let breakType: SourceBreakType | undefined;
  if (isRegrounded) {
    sourceHealth = 'regrounded';
  } else if (hasAccessBreak || hasIdentityBreak) {
    sourceHealth = 'orphaned';
    breakType = hasAccessBreak ? 'access_break' : 'identity_break';
  } else if (hasMeaningBreak) {
    sourceHealth = 'uncertain';
    breakType = 'meaning_break';
  } else if (
    reference.accessStatus === 'unknown' &&
    reference.identityStatus === 'unknown' &&
    reference.meaningStatus === 'unknown'
  ) {
    sourceHealth = 'cached';
  } else {
    sourceHealth = 'grounded';
  }

  return {
    ...reference,
    sourceHealth,
    breakType,
    orphanedAt: sourceHealth === 'orphaned' ? reference.orphanedAt ?? now() : reference.orphanedAt
  };
}

export function relinkExternalReference(
  provenance: NoteProvenance,
  referenceId: string,
  nextValue?: string
): NoteProvenance {
  return {
    ...provenance,
    updatedAt: now(),
    externalReferences: provenance.externalReferences.map((reference) => {
      if (reference.id !== referenceId) return reference;
      return evaluateExternalReferenceHealth({
        ...reference,
        value: nextValue?.trim() ? nextValue.trim() : reference.value,
        accessStatus: 'reachable',
        identityStatus: 'verified',
        meaningStatus: 'aligned',
        lastCheckedAt: now(),
        orphanedAt: reference.orphanedAt ?? (reference.sourceHealth === 'orphaned' ? now() : undefined),
        regroundedFromReferenceId: reference.sourceHealth === 'orphaned' ? reference.id : reference.regroundedFromReferenceId
      });
    })
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
    externalReferences: [...provenance.externalReferences, evaluateExternalReferenceHealth(reference)],
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
    ? [evaluateExternalReferenceHealth({
        id: crypto.randomUUID(),
        kind: 'file' as const,
        label: fileName,
        value: fileName,
        confidence: 1.0,
        isInferred: false,
        accessStatus: 'reachable',
        identityStatus: 'verified',
        meaningStatus: 'aligned',
        lastCheckedAt: t,
        createdAt: t
      })]
    : [];

  return {
    origin: 'file-import',
    createdAt: t,
    updatedAt: t,
    externalReferences: refs
  };
}

export type NoteSourceHealthSummary = {
  hasOrphanedEvidence: boolean;
  hasUnverifiedConclusions: boolean;
  sourceHealthStatus: SourceHealthStatus;
  breakTypes: SourceBreakType[];
};

export function summarizeNoteSourceHealth(note: NoteCardModel): NoteSourceHealthSummary {
  const references = note.provenance?.externalReferences ?? [];
  const evaluated = references.map((reference) => evaluateExternalReferenceHealth(reference));
  const hasOrphanedEvidence = evaluated.some((reference) => reference.sourceHealth === 'orphaned');
  const hasUncertainEvidence = evaluated.some((reference) => reference.sourceHealth === 'uncertain');
  const breakTypes = [...new Set(evaluated.map((reference) => reference.breakType).filter(Boolean))] as SourceBreakType[];
  const hasUnverifiedConclusions = note.verificationState === 'needs-review' || hasOrphanedEvidence || hasUncertainEvidence;
  const sourceHealthStatus: SourceHealthStatus = hasOrphanedEvidence
    ? 'orphaned'
    : hasUncertainEvidence
      ? 'uncertain'
      : evaluated.some((reference) => reference.sourceHealth === 'regrounded')
        ? 'regrounded'
        : evaluated.length
          ? 'grounded'
          : 'cached';

  return {
    hasOrphanedEvidence,
    hasUnverifiedConclusions,
    sourceHealthStatus,
    breakTypes
  };
}

export function getNotesWithOrphanedEvidence(notes: NoteCardModel[]): NoteCardModel[] {
  return notes.filter((note) => summarizeNoteSourceHealth(note).hasOrphanedEvidence);
}

export function getNotesWithUnverifiedConclusions(notes: NoteCardModel[]): NoteCardModel[] {
  const missingSourceTasks = new Set(getTasksDerivedFromMissingSources(notes).map((note) => note.id));
  return notes.filter((note) => summarizeNoteSourceHealth(note).hasUnverifiedConclusions || missingSourceTasks.has(note.id));
}

export function getTasksDerivedFromMissingSources(notes: NoteCardModel[]): NoteCardModel[] {
  const orphanedById = new Set(getNotesWithOrphanedEvidence(notes).map((note) => note.id));
  return notes.filter((note) => note.intent === 'task' && Boolean(note.taskSource?.sourceNoteId) && orphanedById.has(note.taskSource!.sourceNoteId));
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
