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
  showSectionHeading?: boolean;
};

export function AttachmentPanel({
  attachments,
  onAddAttachments,
  onRemoveAttachment,
  onRetryAttachment,
  showSectionHeading = true
}: AttachmentPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [openAttachmentId, setOpenAttachmentId] = useState<string | null>(null);
  const processedCount = useMemo(() => attachments.filter((attachment) => attachment.processing.status === 'processed').length, [attachments]);
  const hasAttachments = attachments.length > 0;

  return (
    <section className="detail-section attachment-panel" aria-label="Attachments">
      {showSectionHeading ? (
        <div className="section-head">
          <div>
            <strong>Files for this note</strong>
            <p className="section-hint">
              {hasAttachments
                ? 'Keep source files close so this note stays grounded in the original material.'
                : 'Add a file so this note can stay connected to its source material.'}
            </p>
          </div>
          {hasAttachments ? <span className="section-meta">{processedCount}/{attachments.length} ready</span> : null}
        </div>
      ) : null}

      {hasAttachments ? (
        <div className="attachment-panel-toolbar">
          <button type="button" className="ghost-button" onClick={() => inputRef.current?.click()}>Add file</button>
          <span className="attachment-panel-supported">Supports {SUPPORTED_ATTACHMENT_TYPE_LABELS.join(' · ')}</span>
          <input ref={inputRef} type="file" multiple accept={SUPPORTED_ATTACHMENT_ACCEPT} hidden onChange={onAddAttachments} />
        </div>
      ) : null}

      {!hasAttachments ? (
        <div className="attachment-empty-state">
          <strong>Add materials</strong>
          <p>Upload a file so this note has supporting context you can refer to while writing.</p>
          <button type="button" className="ghost-button primary-action" onClick={() => inputRef.current?.click()}>Add file</button>
          <input ref={inputRef} type="file" multiple accept={SUPPORTED_ATTACHMENT_ACCEPT} hidden onChange={onAddAttachments} />
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
