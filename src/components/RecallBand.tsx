import { WorkspaceView } from '../types';

type RecallBandProps = {
  count: number;
  archivedCount: number;
  quickCaptureOpen: boolean;
  currentView: WorkspaceView;
  onSetView: (view: WorkspaceView) => void;
  onToggleQuickCapture: () => void;
};

export function RecallBand({
  count,
  archivedCount,
  quickCaptureOpen,
  currentView,
  onSetView,
  onToggleQuickCapture
}: RecallBandProps) {
  return (
    <header className="recall-band">
      <div className="recall-meta">
        <span>{count} live</span>
        <span>{archivedCount} drift</span>
      </div>
      <nav className="view-switch" aria-label="View selection">
        <button className={currentView === 'canvas' ? 'active' : ''} onClick={() => onSetView('canvas')}>
          Field
        </button>
        <button className={currentView === 'archive' ? 'active' : ''} onClick={() => onSetView('archive')}>
          Drift
        </button>
      </nav>
      <button className="ghost-button recall-capture-toggle" onClick={onToggleQuickCapture}>
        {quickCaptureOpen ? 'Hide capture' : 'Show capture'}
      </button>
    </header>
  );
}
