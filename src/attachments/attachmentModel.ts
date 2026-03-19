import { NoteAttachment, AttachmentChunk, AttachmentExtractionMethod, AttachmentFileKind, AttachmentSourceLocation } from '../types';

export const SUPPORTED_ATTACHMENT_TYPE_LABELS = [
  'PDF (.pdf)',
  'Plain text (.txt)',
  'Markdown (.md)',
  'JSON (.json)',
  'CSV (.csv)',
  'Images (.png, .jpg, .jpeg, .webp)'
] as const;

export const SUPPORTED_ATTACHMENT_ACCEPT = '.pdf,.txt,.md,.markdown,.json,.csv,.png,.jpg,.jpeg,.webp';

const TEXT_MIME_TYPES = new Set([
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/json',
  'application/ld+json'
]);

const IMAGE_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

export function classifyAttachmentFile(name: string, mimeType: string): AttachmentFileKind | null {
  const normalizedName = name.trim().toLowerCase();
  const normalizedMime = mimeType.trim().toLowerCase();

  if (normalizedName.endsWith('.pdf') || normalizedMime === 'application/pdf') return 'pdf';
  if (normalizedName.endsWith('.md') || normalizedName.endsWith('.markdown') || normalizedMime === 'text/markdown') return 'markdown';
  if (normalizedName.endsWith('.txt') || normalizedMime === 'text/plain') return 'text';
  if (normalizedName.endsWith('.json') || normalizedMime === 'application/json' || normalizedMime === 'application/ld+json') return 'json';
  if (normalizedName.endsWith('.csv') || normalizedMime === 'text/csv') return 'csv';
  if (normalizedName.endsWith('.png') || normalizedName.endsWith('.jpg') || normalizedName.endsWith('.jpeg') || normalizedName.endsWith('.webp') || IMAGE_MIME_TYPES.has(normalizedMime)) return 'image';
  if (TEXT_MIME_TYPES.has(normalizedMime)) return 'text';
  return null;
}

export function isAttachmentFileSupported(name: string, mimeType: string) {
  return classifyAttachmentFile(name, mimeType) !== null;
}

export function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatAttachmentKind(kind: AttachmentFileKind) {
  switch (kind) {
    case 'pdf':
      return 'PDF';
    case 'markdown':
      return 'Markdown';
    case 'json':
      return 'JSON';
    case 'csv':
      return 'CSV';
    case 'image':
      return 'Image';
    case 'text':
    default:
      return 'Text';
  }
}

export function formatExtractionMethod(method: AttachmentExtractionMethod | null | undefined) {
  if (method === 'ocr') return 'OCR';
  if (method === 'native_text') return 'Native text extraction';
  return 'Pending';
}

export function summarizeSourceLocation(location: AttachmentSourceLocation) {
  if (location.kind === 'page') return `Page ${location.pageNumber ?? 1}`;
  if (location.kind === 'line_range') {
    if (location.lineStart === location.lineEnd) return `Line ${location.lineStart ?? 1}`;
    return `Lines ${location.lineStart ?? 1}-${location.lineEnd ?? location.lineStart ?? 1}`;
  }
  return location.label;
}

export function buildAttachmentTextPreview(chunks: AttachmentChunk[]) {
  return chunks
    .map((chunk) => chunk.text.trim())
    .filter(Boolean)
    .join('\n\n')
    .trim();
}

export function normalizeAttachmentChunk(chunk: Partial<AttachmentChunk>, index: number): AttachmentChunk | null {
  if (typeof chunk.text !== 'string' || !chunk.text.trim()) return null;
  const sourceLocation = chunk.sourceLocation;
  if (!sourceLocation || typeof sourceLocation !== 'object' || typeof sourceLocation.label !== 'string') return null;

  return {
    id: String(chunk.id ?? `chunk-${index + 1}`),
    text: chunk.text,
    sourceLocation: {
      kind: sourceLocation.kind === 'page' || sourceLocation.kind === 'line_range' ? sourceLocation.kind : 'source',
      label: sourceLocation.label,
      pageNumber: typeof sourceLocation.pageNumber === 'number' ? sourceLocation.pageNumber : undefined,
      lineStart: typeof sourceLocation.lineStart === 'number' ? sourceLocation.lineStart : undefined,
      lineEnd: typeof sourceLocation.lineEnd === 'number' ? sourceLocation.lineEnd : undefined
    }
  } satisfies AttachmentChunk;
}

export function normalizeAttachment(raw: Partial<NoteAttachment>, index: number): NoteAttachment | null {
  const fileKind = raw.fileKind ? classifyAttachmentFile(raw.name ?? '', raw.mimeType ?? '') ?? raw.fileKind : classifyAttachmentFile(raw.name ?? '', raw.mimeType ?? '');
  if (!fileKind || typeof raw.id !== 'string' || typeof raw.name !== 'string') return null;

  const chunks = Array.isArray(raw.extraction?.chunks)
    ? raw.extraction.chunks.map((chunk, chunkIndex) => normalizeAttachmentChunk(chunk, chunkIndex)).filter((chunk): chunk is AttachmentChunk => Boolean(chunk))
    : [];

  return {
    id: raw.id,
    name: raw.name,
    mimeType: String(raw.mimeType ?? ''),
    fileSize: Number(raw.fileSize ?? 0),
    addedAt: Number(raw.addedAt ?? Date.now()),
    fileKind,
    rawFile: {
      dataUrl: String(raw.rawFile?.dataUrl ?? ''),
      contentHash: String(raw.rawFile?.contentHash ?? ''),
      lastModified: Number(raw.rawFile?.lastModified ?? raw.addedAt ?? Date.now())
    },
    processing: {
      status: raw.processing?.status === 'processing' || raw.processing?.status === 'processed' || raw.processing?.status === 'failed' ? raw.processing.status : 'uploaded',
      error: raw.processing?.error ? String(raw.processing.error) : null,
      retryCount: Number(raw.processing?.retryCount ?? 0),
      updatedAt: Number(raw.processing?.updatedAt ?? raw.addedAt ?? Date.now())
    },
    extraction: raw.extraction
      ? {
          method: raw.extraction.method === 'ocr' ? 'ocr' : 'native_text',
          extractedAt: Number(raw.extraction.extractedAt ?? raw.processing?.updatedAt ?? raw.addedAt ?? Date.now()),
          contentHash: String(raw.extraction.contentHash ?? raw.rawFile?.contentHash ?? ''),
          text: typeof raw.extraction.text === 'string' ? raw.extraction.text : buildAttachmentTextPreview(chunks),
          chunks
        }
      : null
  } satisfies NoteAttachment;
}
