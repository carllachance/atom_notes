import { ProjectId, WorkspaceId } from '../types';

type RecallBandProps = {
  count: number;
  archivedCount: number;
  quickCaptureOpen: boolean;
  activeLensLabel: string;
  activeLensDescription: string;
  activeWorkspaceId: WorkspaceId | null;
  activeProjectId: ProjectId | null;
  availableWorkspaceIds: WorkspaceId[];
  availableProjectIds: ProjectId[];
  revealQuery: string;
  revealMatchCount: number;
  onSetWorkspaceLens: (workspaceId: WorkspaceId | null) => void;
  onSetProjectLens: (projectId: ProjectId | null) => void;
  onToggleQuickCapture: () => void;
  onWhereWasI: () => void;
  onRevealQueryChange: (query: string) => void;
  onReveal: () => void;
  onRevealNext: () => void;
  onRevealPrev: () => void;
};

export function RecallBand({
  count,
  archivedCount,
  quickCaptureOpen,
  activeLensLabel,
  activeLensDescription,
  activeWorkspaceId,
  activeProjectId,
  availableWorkspaceIds,
  availableProjectIds,
  revealQuery,
  revealMatchCount,
  onSetWorkspaceLens,
  onSetProjectLens,
  onToggleQuickCapture,
  onWhereWasI,
  onRevealQueryChange,
  onReveal,
  onRevealNext,
  onRevealPrev
}: RecallBandProps) {
  return (
    <header className="recall-band">
      <div className="recall-lens-status" aria-live="polite">
        <span className="lens-kicker">Active lens</span>
        <strong>{activeLensLabel}</strong>
        <small>{activeLensDescription}</small>
      </div>

      <div className="recall-meta">
        <span>{count} visible</span>
        <span>{archivedCount} archived</span>
      </div>

      <div className="lens-controls" aria-label="Scoped lenses">
        <label>
          <span>Workspace</span>
          <select value={activeWorkspaceId ?? ''} onChange={(event) => onSetWorkspaceLens(event.target.value || null)}>
            <option value="">Shared universe</option>
            {availableWorkspaceIds.map((workspaceId) => (
              <option key={workspaceId} value={workspaceId}>
                {workspaceId}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Project</span>
          <select value={activeProjectId ?? ''} onChange={(event) => onSetProjectLens(event.target.value || null)}>
            <option value="">No project lens</option>
            {availableProjectIds.map((projectId) => (
              <option key={projectId} value={projectId}>
                {projectId}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="reveal-controls">
        <input
          aria-label="Reveal query"
          placeholder="Reveal across scopes…"
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

      <button className="ghost-button recall-capture-toggle" onClick={onWhereWasI}>
        Where was I?
      </button>
      <button className="ghost-button recall-capture-toggle" onClick={onToggleQuickCapture}>
        {quickCaptureOpen ? 'Close capture' : 'Open capture'}
      </button>
    </header>
  );
}
