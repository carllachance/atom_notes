import { buildAttachmentTextPreview, classifyAttachmentFile } from './attachmentModel';
import { AttachmentChunk, AttachmentExtractionMethod, NoteAttachment } from '../types';

export type PreparedAttachment = Pick<NoteAttachment, 'id' | 'name' | 'mimeType' | 'fileSize' | 'addedAt' | 'fileKind' | 'rawFile' | 'processing' | 'extraction'>;

export type ProcessedAttachment = {
  method: AttachmentExtractionMethod;
  text: string;
  chunks: AttachmentChunk[];
  contentHash: string;
};

type PdfPage = { pageNumber: number; text: string; canvas?: HTMLCanvasElement };

type PdfJsModule = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (source: { data: Uint8Array }) => { promise: Promise<{ numPages: number; getPage: (pageNumber: number) => Promise<unknown> }> };
};

type TesseractModule = {
  recognize: (image: string | HTMLCanvasElement, language: string, options?: Record<string, unknown>) => Promise<{ data: { text: string } }>;
};

let pdfjsPromise: Promise<PdfJsModule> | null = null;
let tesseractPromise: Promise<TesseractModule> | null = null;

export async function createAttachmentFromFile(file: File, nowTs = Date.now()): Promise<PreparedAttachment> {
  const fileKind = classifyAttachmentFile(file.name, file.type);
  if (!fileKind) {
    throw new Error('This file type is not supported in v1 yet. Try PDF, text, markdown, JSON, CSV, or common image files.');
  }

  const arrayBuffer = await file.arrayBuffer();
  const dataUrl = await arrayBufferToDataUrl(arrayBuffer, file.type || inferMimeTypeFromName(file.name));
  const contentHash = await hashArrayBuffer(arrayBuffer);

  return {
    id: crypto.randomUUID(),
    name: file.name,
    mimeType: file.type || inferMimeTypeFromName(file.name),
    fileSize: file.size,
    addedAt: nowTs,
    fileKind,
    rawFile: {
      dataUrl,
      contentHash,
      lastModified: file.lastModified || nowTs
    },
    processing: {
      status: 'uploaded',
      error: null,
      retryCount: 0,
      updatedAt: nowTs
    },
    extraction: null
  };
}

export async function processAttachment(attachment: NoteAttachment): Promise<ProcessedAttachment> {
  const bytes = dataUrlToUint8Array(attachment.rawFile.dataUrl);

  switch (attachment.fileKind) {
    case 'text':
    case 'markdown':
    case 'json':
    case 'csv':
      return processTextDocument(bytes, attachment.rawFile.contentHash);
    case 'image':
      return processImageAttachment(attachment.rawFile.dataUrl, attachment.rawFile.contentHash);
    case 'pdf':
      return processPdfAttachment(bytes, attachment.rawFile.contentHash);
    default:
      throw new Error('This attachment cannot be processed yet.');
  }
}

export function chunkTextByLines(text: string, linesPerChunk = 24): AttachmentChunk[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const chunks: AttachmentChunk[] = [];

  for (let start = 0; start < lines.length; start += linesPerChunk) {
    const end = Math.min(lines.length, start + linesPerChunk);
    const slice = lines.slice(start, end).join('\n').trim();
    if (!slice) continue;
    chunks.push({
      id: `line-${start + 1}-${end}`,
      text: slice,
      sourceLocation: {
        kind: 'line_range',
        label: end === start + 1 ? `Line ${start + 1}` : `Lines ${start + 1}-${end}`,
        lineStart: start + 1,
        lineEnd: end
      }
    });
  }

  return chunks;
}

function processTextDocument(bytes: Uint8Array, contentHash: string): ProcessedAttachment {
  const text = new TextDecoder().decode(bytes).trim();
  if (!text) throw new Error('No readable text was found in this file.');
  const chunks = chunkTextByLines(text);
  return { method: 'native_text', text, chunks, contentHash };
}

async function processImageAttachment(dataUrl: string, contentHash: string): Promise<ProcessedAttachment> {
  const ocrText = (await runOcr(dataUrl)).trim();
  if (!ocrText) throw new Error('OCR completed but did not find readable text.');
  const chunks: AttachmentChunk[] = [{
    id: 'page-1',
    text: ocrText,
    sourceLocation: { kind: 'page', label: 'Page 1', pageNumber: 1 }
  }];
  return { method: 'ocr', text: ocrText, chunks, contentHash };
}

async function processPdfAttachment(bytes: Uint8Array, contentHash: string): Promise<ProcessedAttachment> {
  const pages = await readPdfPages(bytes);
  const nativeChunks = pages
    .map((page) => ({
      id: `page-${page.pageNumber}`,
      text: page.text.trim(),
      sourceLocation: { kind: 'page' as const, label: `Page ${page.pageNumber}`, pageNumber: page.pageNumber }
    }))
    .filter((chunk) => chunk.text);

  if (nativeChunks.length > 0) {
    return {
      method: 'native_text',
      text: buildAttachmentTextPreview(nativeChunks),
      chunks: nativeChunks,
      contentHash
    };
  }

  const ocrChunks: AttachmentChunk[] = [];
  for (const page of pages) {
    if (!page.canvas) continue;
    const ocrText = (await runOcr(page.canvas)).trim();
    if (!ocrText) continue;
    ocrChunks.push({
      id: `page-${page.pageNumber}`,
      text: ocrText,
      sourceLocation: { kind: 'page', label: `Page ${page.pageNumber}`, pageNumber: page.pageNumber }
    });
  }

  if (ocrChunks.length === 0) {
    throw new Error('No native text was found, and OCR could not recover readable text from this PDF.');
  }

  return {
    method: 'ocr',
    text: buildAttachmentTextPreview(ocrChunks),
    chunks: ocrChunks,
    contentHash
  };
}

async function readPdfPages(bytes: Uint8Array): Promise<PdfPage[]> {
  const pdfjs = await loadPdfJs();
  const pdfDocument = await pdfjs.getDocument({ data: bytes }).promise;
  const pages: PdfPage[] = [];

  for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
    const page = await pdfDocument.getPage(pageNumber) as {
      getTextContent: () => Promise<{ items: Array<{ str?: string; hasEOL?: boolean }> }>;
      getViewport: (params: { scale: number }) => { width: number; height: number };
      render: (params: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }) => { promise: Promise<void> };
    };

    const textContent = await page.getTextContent();
    const text = textContent.items
      .map((item) => `${item.str ?? ''}${item.hasEOL ? '\n' : ' '}`)
      .join('')
      .replace(/\s+\n/g, '\n')
      .replace(/\n\s+/g, '\n')
      .trim();

    let canvas: HTMLCanvasElement | undefined;
    if (!text) {
      const viewport = page.getViewport({ scale: 1.6 });
      canvas = window.document.createElement('canvas');
      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));
      const context = canvas.getContext('2d');
      if (context) await page.render({ canvasContext: context, viewport }).promise;
    }

    pages.push({ pageNumber, text, canvas });
  }

  return pages;
}

async function runOcr(source: string | HTMLCanvasElement) {
  const tesseract = await loadTesseract();
  const result = await tesseract.recognize(source, 'eng', {});
  return result.data.text ?? '';
}

async function loadPdfJs(): Promise<PdfJsModule> {
  if (!pdfjsPromise) {
    pdfjsPromise = importFromUrl('https://esm.sh/pdfjs-dist@4.10.38/build/pdf.mjs') as Promise<PdfJsModule>;
  }

  const pdfjs = await pdfjsPromise;
  pdfjs.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@4.10.38/build/pdf.worker.mjs';
  return pdfjs;
}

async function loadTesseract(): Promise<TesseractModule> {
  if (!tesseractPromise) {
    tesseractPromise = importFromUrl('https://esm.sh/tesseract.js@5.1.1') as Promise<TesseractModule>;
  }

  return tesseractPromise;
}


async function importFromUrl(url: string) {
  const importer = new Function('u', 'return import(/* @vite-ignore */ u);') as (u: string) => Promise<unknown>;
  return importer(url);
}

async function hashArrayBuffer(arrayBuffer: ArrayBuffer) {
  const digest = await crypto.subtle.digest('SHA-256', arrayBuffer);
  return Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, '0')).join('');
}

function arrayBufferToDataUrl(arrayBuffer: ArrayBuffer, mimeType: string) {
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return Promise.resolve(`data:${mimeType};base64,${btoa(binary)}`);
}

function dataUrlToUint8Array(dataUrl: string) {
  const [, payload = ''] = dataUrl.split(',', 2);
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function inferMimeTypeFromName(name: string) {
  const lowered = name.toLowerCase();
  if (lowered.endsWith('.pdf')) return 'application/pdf';
  if (lowered.endsWith('.md') || lowered.endsWith('.markdown')) return 'text/markdown';
  if (lowered.endsWith('.json')) return 'application/json';
  if (lowered.endsWith('.csv')) return 'text/csv';
  if (lowered.endsWith('.png')) return 'image/png';
  if (lowered.endsWith('.jpg') || lowered.endsWith('.jpeg')) return 'image/jpeg';
  if (lowered.endsWith('.webp')) return 'image/webp';
  return 'text/plain';
}
