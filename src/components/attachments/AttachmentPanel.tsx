import { ChangeEvent, useMemo, useRef, useState } from 'react';
import {
  buildAttachmentTextPreview,
  formatAttachmentKind,
  formatExtractionMethod,
  formatFileSize,
  summarizeSourceLocation,
  SUPPORTED_ATTACHMENT_ACCEPT,
  SUPPORTED_ATTACHMENT_TYPE_LABELS
} from '../../attachments/attachmentModel';
import { NoteAttachment } from '../../types';

const STATUS_COPY: Record<NoteAttachment['processing']['status'], string> = {
  uploaded: 'Queued',
  processing: 'Processing',
  processed: 'Processed',
  failed: 'Failed'
};

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(timestamp);
}

type AttachmentPanelProps = {
  attachments: NoteAttachment[];
  onAddAttachments: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>;
  onRemoveAttachment: (attachmentId: string) => void;
  onRetryAttachment: (attachmentId: string) => void;
};

export function AttachmentPanel({ attachments, onAddAttachments, onRemoveAttachment, onRetryAttachment }: AttachmentPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [openAttachmentId, setOpenAttachmentId] = useState<string | null>(null);
  const processedCount = useMemo(() => attachments.filter((attachment) => attachment.processing.status === 'processed').length, [attachments]);

  return (
    <section className="detail-section attachment-panel" aria-label="Attachments">
      <div className="section-head">
        <div>
          <strong>Source material</strong>
          <p className="section-hint">Keep raw files and extracted text together so the note stays inspectable without crowding the main reading flow.</p>
        </div>
        <span className="section-meta">{processedCount}/{attachments.length} ready</span>
      </div>

      <div className="attachment-panel-toolbar">
        <button type="button" className="ghost-button" onClick={() => inputRef.current?.click()}>Add attachments</button>
        <button
          type="button"
          className="ghost-button attachment-panel-supported"
          title={`Supported file types: ${SUPPORTED_ATTACHMENT_TYPE_LABELS.join(', ')}`}
          aria-label={`Supported file types: ${SUPPORTED_ATTACHMENT_TYPE_LABELS.join(', ')}`}
        >
          File types
        </button>
        <input ref={inputRef} type="file" multiple accept={SUPPORTED_ATTACHMENT_ACCEPT} hidden onChange={onAddAttachments} />
      </div>

      {attachments.length === 0 ? (
        <div className="attachment-empty-state">
          <strong>No files attached yet.</strong>
          <p>Add source material here so notes can keep the original file, extraction state, and inspectable text together. Supported types: {SUPPORTED_ATTACHMENT_TYPE_LABELS.join(', ')}.</p>
        </div>
      ) : (
        <div className="attachment-list">
          {attachments.map((attachment) => {
            const isOpen = openAttachmentId === attachment.id;
            const previewText = attachment.extraction?.text?.trim() || buildAttachmentTextPreview(attachment.extraction?.chunks ?? []);
            return (
              <article key={attachment.id} className={`attachment-card attachment-card--${attachment.processing.status}`}>
                <div className="attachment-card__header">
                  <div>
                    <strong>{attachment.name}</strong>
                    <div className="attachment-card__meta">
                      <span>{formatAttachmentKind(attachment.fileKind)}</span>
                      <span>{formatFileSize(attachment.fileSize)}</span>
                      <span>Added {formatDate(attachment.addedAt)}</span>
                    </div>
                  </div>
                  <span className={`attachment-status attachment-status--${attachment.processing.status}`}>{STATUS_COPY[attachment.processing.status]}</span>
                </div>

                <div className="attachment-card__actions">
                  {attachment.processing.status === 'processed' ? (
                    <button type="button" className={`ghost-button ${isOpen ? 'active' : ''}`} onClick={() => setOpenAttachmentId(isOpen ? null : attachment.id)}>
                      {isOpen ? 'Hide extracted text' : 'View extracted text'}
                    </button>
                  ) : null}
                  {attachment.processing.status === 'failed' ? (
                    <button type="button" className="ghost-button" onClick={() => onRetryAttachment(attachment.id)}>Retry</button>
                  ) : null}
                  <button type="button" className="ghost-button" onClick={() => onRemoveAttachment(attachment.id)}>Remove</button>
                </div>

                {attachment.processing.error ? <p className="attachment-card__error">{attachment.processing.error}</p> : null}

                {attachment.extraction ? (
                  <div className="attachment-card__summary">
                    <span>{formatExtractionMethod(attachment.extraction.method)}</span>
                    <span>{attachment.extraction.chunks.length} source {attachment.extraction.chunks.length === 1 ? 'chunk' : 'chunks'}</span>
                  </div>
                ) : null}

                {isOpen && attachment.extraction ? (
                  <div className="attachment-text-view">
                    <div className="attachment-text-view__header">
                      <strong>{formatExtractionMethod(attachment.extraction.method)}</strong>
                      <span>{attachment.extraction.chunks.length} locations</span>
                    </div>
                    <p className="attachment-text-view__summary">{previewText ? 'Inspect the extracted content and its source location before you rely on it.' : 'No text is available yet.'}</p>
                    <div className="attachment-chunk-list">
                      {attachment.extraction.chunks.map((chunk) => (
                        <article key={chunk.id} className="attachment-chunk-card">
                          <div className="attachment-chunk-card__meta">{summarizeSourceLocation(chunk.sourceLocation)}</div>
                          <pre>{chunk.text}</pre>
                        </article>
                      ))}
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
