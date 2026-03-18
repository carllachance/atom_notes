import { Lens } from '../types';

type RecallBandProps = {
  count: number;
  archivedCount: number;
  quickCaptureOpen: boolean;
  lens: Lens;
  revealQuery: string;
  revealMatchCount: number;
  onSetLens: (lens: Lens) => void;
  onToggleQuickCapture: () => void;
  onWhereWasI: () => void;
  onFocusSelectedNote: () => void;
  onFocusSelectedCluster: () => void;
  onResetView: () => void;
  onRevealQueryChange: (query: string) => void;
  onReveal: () => void;
  onRevealNext: () => void;
  onRevealPrev: () => void;
};

export function RecallBand({
  count,
  archivedCount,
  quickCaptureOpen,
  lens,
  revealQuery,
  revealMatchCount,
  onSetLens,
  onToggleQuickCapture,
  onWhereWasI,
  onFocusSelectedNote,
  onFocusSelectedCluster,
  onResetView,
  onRevealQueryChange,
  onReveal,
  onRevealNext,
  onRevealPrev
}: RecallBandProps) {
  return (
    <header className="recall-band">
      <div className="recall-meta">
        <span>{count} notes</span>
        <span>{archivedCount} archived</span>
      </div>
      <nav className="view-switch" aria-label="Lens selection">
        <button className={lens === 'all' ? 'active' : ''} onClick={() => onSetLens('all')}>
          Canvas
        </button>
        <button className={lens === 'focus' ? 'active' : ''} onClick={() => onSetLens('focus')}>
          Focus
        </button>
        <button className={lens === 'archive' ? 'active' : ''} onClick={() => onSetLens('archive')}>
          Archive
        </button>
      </nav>

      <div className="reveal-controls">
        <input
          aria-label="Reveal query"
          placeholder="Reveal on canvas…"
          value={revealQuery}
          onChange={(event) => onRevealQueryChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') onReveal();
          }}
        />
        <button className="ghost-button" onClick={onReveal}>
          Reveal
        </button>
        <button className="ghost-button" onClick={onRevealPrev} disabled={revealMatchCount < 2}>
          ‹
        </button>
        <button className="ghost-button" onClick={onRevealNext} disabled={revealMatchCount < 2}>
          ›
        </button>
      </div>

      <div className="orientation-controls" aria-label="Canvas orientation helpers">
        <button className="ghost-button recall-capture-toggle" onClick={onFocusSelectedNote}>
          Focus note
        </button>
        <button className="ghost-button recall-capture-toggle" onClick={onFocusSelectedCluster}>
          Focus cluster
        </button>
        <button className="ghost-button recall-capture-toggle" onClick={onResetView}>
          Recenter
        </button>
      </div>

      <button className="ghost-button recall-capture-toggle" onClick={onWhereWasI}>
        Where was I?
      </button>
      <button className="ghost-button recall-capture-toggle" onClick={onToggleQuickCapture}>
        {quickCaptureOpen ? 'Close capture' : 'Open capture'}
      </button>
    </header>
  );
}
