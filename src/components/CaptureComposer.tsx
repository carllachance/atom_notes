import { KeyboardEvent } from 'react';

type CaptureComposerProps = {
  isOpen: boolean;
  isMobileViewport?: boolean;
  compactWhenNoteOpen?: boolean;
  value: string;
  onChange: (value: string) => void;
  onCommit: () => void;
  onCancel: () => void;
  onUndo: () => void;
  onExpand: () => void;
  canUndo: boolean;
};

export function CaptureComposer({
  isOpen,
  isMobileViewport = false,
  compactWhenNoteOpen = false,
  value,
  onChange,
  onCommit,
  onCancel,
  onUndo,
  onExpand,
  canUndo
}: CaptureComposerProps) {
  const showDockedMobileAffordance = isMobileViewport && !isOpen;
  const showMobileCollapsedAffordance = showDockedMobileAffordance && compactWhenNoteOpen;

  return (
    <section
      className="capture-composer-shell"
      aria-label="Capture composer"
      data-state={isOpen ? 'open' : 'compact'}
      data-note-open={compactWhenNoteOpen ? 'true' : 'false'}
    >
      {isOpen ? (
        <div className="capture-composer capture-composer--expanded">
          <header>
            <div>
              <strong>Capture</strong>
              <small>Quick entry, then back to the canvas.</small>
            </div>
            <button type="button" className="ghost-button" onClick={onCancel} aria-label="Close capture panel">
              Close
            </button>
          </header>
          <textarea
            id="quick-capture"
            autoFocus
            placeholder="Capture the next note."
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event: KeyboardEvent<HTMLTextAreaElement>) => {
              if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                event.preventDefault();
                onCommit();
              }
              if (event.key === 'Escape') {
                event.preventDefault();
                onCancel();
              }
            }}
          />
          <footer>
            <span>Ctrl+Enter to save · Esc to collapse</span>
            <div className="capture-composer__actions">
              {canUndo ? (
                <button type="button" className="ghost-button" onClick={onUndo}>
                  Undo last capture
                </button>
              ) : null}
              <button type="button" onClick={onCommit} disabled={!value.trim()}>
                Capture note
              </button>
            </div>
          </footer>
        </div>
      ) : showDockedMobileAffordance ? (
        <div className={`capture-composer capture-composer--mobile-dock ${showMobileCollapsedAffordance ? 'capture-composer--mobile-dock-minimized' : ''}`}>
          <button
            type="button"
            className="ghost-button capture-composer__dock-trigger"
            onClick={onExpand}
            aria-label="Open capture composer"
          >
            <span className="capture-composer__dock-icon" aria-hidden>✎</span>
            <span className="capture-composer__dock-copy">
              <strong>{showMobileCollapsedAffordance ? 'Capture' : 'Capture a note'}</strong>
              {showMobileCollapsedAffordance ? null : <small>Ready when you are</small>}
            </span>
          </button>
        </div>
      ) : (
        <div className="capture-composer capture-composer--compact-bar">
          <div className="capture-composer__compact-copy">
            <strong>Capture</strong>
          </div>
          <div className="capture-composer__compact-row">
            <input
              aria-label="Quick capture"
              placeholder="Write a note..."
              value={value}
              onFocus={onExpand}
              onChange={(event) => onChange(event.target.value)}
              onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
                if (event.key === 'Enter' && value.trim()) {
                  event.preventDefault();
                  onCommit();
                }
                if (event.key === 'Escape') {
                  event.preventDefault();
                  onCancel();
                }
              }}
            />
            <button type="button" className="ghost-button tertiary-action" onClick={onExpand}>
              Expand
            </button>
            {canUndo ? (
              <button type="button" className="ghost-button" onClick={onUndo}>
                Undo
              </button>
            ) : null}
            <button type="button" onClick={onCommit} disabled={!value.trim()}>
              Add note
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
