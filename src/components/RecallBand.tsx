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
      <div>
        <h1>Atom Notes</h1>
        <p>Ambient thinking surface</p>
      </div>
      <div className="recall-meta">
        <span>{count} active</span>
        <span>{archivedCount} archived</span>
      </div>
      <nav className="view-switch" aria-label="View selection">
        <button className={currentView === 'canvas' ? 'active' : ''} onClick={() => onSetView('canvas')}>
          Workspace
        </button>
        <button className={currentView === 'archive' ? 'active' : ''} onClick={() => onSetView('archive')}>
          Archive
        </button>
      </nav>
      <button className="ghost-button" onClick={onToggleQuickCapture}>
        {quickCaptureOpen ? 'Hide capture tray' : 'Open capture tray'}
      </button>
    </header>
  );
}
