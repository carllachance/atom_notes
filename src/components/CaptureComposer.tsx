import { KeyboardEvent } from 'react';

type CaptureComposerProps = {
  isOpen: boolean;
  value: string;
  onChange: (value: string) => void;
  onCommit: () => void;
  onCancel: () => void;
  onUndo: () => void;
  canUndo: boolean;
};

export function CaptureComposer({ isOpen, value, onChange, onCommit, onCancel, onUndo, canUndo }: CaptureComposerProps) {
  if (!isOpen) return null;

  return (
    <section className="capture-composer-shell" aria-label="Capture composer">
      <div className="capture-composer">
        <header>
          <strong>Capture</strong>
          <small>Enter for newline · Ctrl+Enter to commit</small>
        </header>
        <textarea
          id="quick-capture"
          autoFocus
          placeholder="Write naturally. The first line becomes the title."
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event: KeyboardEvent<HTMLTextAreaElement>) => {
            if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
              event.preventDefault();
              onCommit();
            }
            if (event.key === 'Escape' && !value.trim()) {
              event.preventDefault();
              onCancel();
            }
          }}
        />
        <footer>
          <button className="ghost-button" onClick={onCancel}>
            Cancel
          </button>
          {canUndo ? (
            <button className="ghost-button" onClick={onUndo}>
              Undo last capture
            </button>
          ) : null}
          <button onClick={onCommit} disabled={!value.trim()}>
            Commit
          </button>
        </footer>
      </div>
    </section>
  );
}
