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
        <span>{count} notes</span>
        <span>{archivedCount} archived</span>
      </div>
      <nav className="view-switch" aria-label="View selection">
        <button className={currentView === 'canvas' ? 'active' : ''} onClick={() => onSetView('canvas')}>
          Canvas
        </button>
        <button className={currentView === 'archive' ? 'active' : ''} onClick={() => onSetView('archive')}>
          Archive
        </button>
      </nav>
      <button className="ghost-button recall-capture-toggle" onClick={onToggleQuickCapture}>
        {quickCaptureOpen ? 'Close capture' : 'Open capture'}
      </button>
    </header>
  );
}
