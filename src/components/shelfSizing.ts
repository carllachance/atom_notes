import { getRecapPreview, getSuggestedFollowUpPreview, getSummaryPreview, getUnresolvedPreview } from '../noteText';
import { NoteCardModel, NoteShelfSize } from '../types';

export type ShelfContentSignals = {
  previewText: string;
  previewChars: number;
  semanticLines: string[];
  metadataCount: number;
  relatedCount: number;
};

export type ResolvedShelfSize = {
  shelfSize: NoteShelfSize;
  isPinnedLarge: boolean;
  didDowngrade: boolean;
  contentSignals: ShelfContentSignals;
};

const FALLBACK_PREVIEW = 'No summary yet.';

function oneTierDown(size: NoteShelfSize): NoteShelfSize {
  if (size === 'hero') return 'featured';
  if (size === 'featured') return 'standard';
  if (size === 'standard') return 'compact';
  return 'compact';
}

export function collectShelfContentSignals(note: NoteCardModel, relatedCount: number): ShelfContentSignals {
  const previewText = getSummaryPreview(note, 420);
  const previewChars = previewText === FALLBACK_PREVIEW ? 0 : previewText.length;
  const semanticLines = [
    getRecapPreview(note, 180),
    getUnresolvedPreview(note, 180),
    getSuggestedFollowUpPreview(note, 180)
  ].filter(Boolean);

  const metadataCount = [
    note.intent,
    note.taskState,
    note.workspaceId,
    note.projectIds.length > 0 ? 'project' : null,
    note.attachments?.length ? 'attachment' : null,
    note.inferredRelationships?.length ? 'inferred' : null,
    note.provenance?.externalReferences?.length ? 'source' : null,
    relatedCount > 0 ? 'related' : null
  ].filter(Boolean).length;

  return {
    previewText,
    previewChars,
    semanticLines,
    metadataCount,
    relatedCount
  };
}

function isLargeContentFit(target: NoteShelfSize, signals: ShelfContentSignals): boolean {
  if (target === 'hero') {
    return (
      signals.previewChars >= 240 ||
      (signals.previewChars >= 180 && signals.semanticLines.length >= 1) ||
      signals.semanticLines.length >= 2 ||
      (signals.metadataCount >= 5 && signals.previewChars >= 130)
    );
  }

  if (target === 'featured') {
    return (
      signals.previewChars >= 130 ||
      signals.semanticLines.length >= 1 ||
      signals.metadataCount >= 4
    );
  }

  return true;
}

function isTooSparseForRenderedTier(size: NoteShelfSize, signals: ShelfContentSignals): boolean {
  if (size === 'hero') return signals.previewChars < 170 && signals.semanticLines.length === 0 && signals.metadataCount < 4;
  if (size === 'featured') return signals.previewChars < 110 && signals.semanticLines.length === 0 && signals.metadataCount < 3;
  return false;
}

export function resolveShelfSize(note: NoteCardModel, autoSize: NoteShelfSize, relatedCount: number): ResolvedShelfSize {
  const requestedSize = note.shelfSize ?? autoSize;
  const isPinnedLarge = Boolean(note.shelfSize && (note.shelfSize === 'featured' || note.shelfSize === 'hero'));
  const contentSignals = collectShelfContentSignals(note, relatedCount);

  let resolved = requestedSize;
  let didDowngrade = false;

  if (!isPinnedLarge && (requestedSize === 'featured' || requestedSize === 'hero') && !isLargeContentFit(requestedSize, contentSignals)) {
    resolved = oneTierDown(requestedSize);
    didDowngrade = true;
  }

  if (!isPinnedLarge && !didDowngrade && isTooSparseForRenderedTier(resolved, contentSignals)) {
    resolved = oneTierDown(resolved);
    didDowngrade = true;
  }

  return {
    shelfSize: resolved,
    isPinnedLarge,
    didDowngrade,
    contentSignals
  };
}
