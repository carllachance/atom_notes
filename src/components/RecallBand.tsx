import { FocusMode, Lens, Project, Workspace } from '../types';

type RecallBandProps = {
  count: number;
  archivedCount: number;
  lens: Lens;
  lensLabel: string;
  projects: Project[];
  workspaces: Workspace[];
  focusMode: FocusMode;
  focusCount: number;
  revealQuery: string;
  revealMatchCount: number;
  onSetLens: (lens: Lens) => void;
  onSetFocusMode: (updates: Partial<FocusMode>) => void;
  onOpenComposer: () => void;
  onWhereWasI: () => void;
  onRevealQueryChange: (query: string) => void;
  onReveal: () => void;
  onRevealNext: () => void;
  onRevealPrev: () => void;
};

export function RecallBand({
  count,
  archivedCount,
  lens,
  lensLabel,
  projects,
  workspaces,
  focusMode,
  focusCount,
  revealQuery,
  revealMatchCount,
  onSetLens,
  onSetFocusMode,
  onOpenComposer,
  onWhereWasI,
  onRevealQueryChange,
  onReveal,
  onRevealNext,
  onRevealPrev
}: RecallBandProps) {
  const activeProjectId = lens.kind === 'project' || lens.kind === 'reveal' ? lens.projectId ?? '' : '';
  const activeWorkspaceId = lens.kind === 'workspace' || lens.kind === 'reveal' ? lens.workspaceId ?? '' : '';
  const scopeMode = lens.kind === 'project' || lens.kind === 'workspace' || lens.kind === 'reveal' ? lens.mode : 'context';

  return (
    <header className="recall-band">
      <div className="recall-meta">
        <span>{count} notes</span>
        <span>{archivedCount} archived</span>
      </div>
      <nav className="view-switch" aria-label="Lens selection">
        <button className={lens.kind === 'universe' ? 'active' : ''} onClick={() => onSetLens({ kind: 'universe' })}>Universe</button>
        <button className={lens.kind === 'project' ? 'active' : ''} onClick={() => onSetLens({ kind: 'project', projectId: activeProjectId || (projects[0]?.id ?? null), mode: scopeMode })}>Project</button>
        <button className={lens.kind === 'workspace' ? 'active' : ''} onClick={() => onSetLens({ kind: 'workspace', workspaceId: activeWorkspaceId || (workspaces[0]?.id ?? null), mode: scopeMode })}>Workspace</button>
        <button className={lens.kind === 'archive' ? 'active' : ''} onClick={() => onSetLens({ kind: 'archive' })}>Archive</button>
      </nav>

      <div className="active-lens-indicator" aria-live="polite">
        <span className="active-lens-label">Active lens</span>
        <strong>{lensLabel}</strong>
      </div>

      <div className="project-reveal-controls focus-controls">
        <button
          className={`ghost-button ${focusMode.highlight ? 'active' : ''}`}
          title="Highlight Focus notes"
          onClick={() => onSetFocusMode({ highlight: !focusMode.highlight })}
        >
          Highlight Focus
        </button>
        <button
          className={`ghost-button ${focusMode.isolate ? 'active' : ''}`}
          title="Show only Focus notes"
          onClick={() => onSetFocusMode({ isolate: !focusMode.isolate })}
        >
          Focus only
        </button>
        <span className="focus-count-chip">{focusCount} Focus</span>
      </div>

      <div className="project-reveal-controls">
        <label className="project-reveal-label" htmlFor="project-lens-select">Project</label>
        <select id="project-lens-select" value={activeProjectId} onChange={(event) => onSetLens(event.target.value ? { kind: 'project', projectId: event.target.value, mode: scopeMode } : { kind: 'universe' })}>
          <option value="">All projects</option>
          {projects.map((project) => <option key={project.id} value={project.id}>{project.key} · {project.name}</option>)}
        </select>
      </div>

      <div className="project-reveal-controls">
        <label className="project-reveal-label" htmlFor="workspace-lens-select">Workspace</label>
        <select id="workspace-lens-select" value={activeWorkspaceId} onChange={(event) => onSetLens(event.target.value ? { kind: 'workspace', workspaceId: event.target.value, mode: scopeMode } : { kind: 'universe' })}>
          <option value="">All workspaces</option>
          {workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.key} · {workspace.name}</option>)}
        </select>
        <button className={`ghost-button ${scopeMode === 'strict' ? 'active' : ''}`} disabled={lens.kind !== 'project' && lens.kind !== 'workspace' && lens.kind !== 'reveal'} onClick={() => {
          if (lens.kind === 'project' || lens.kind === 'workspace' || lens.kind === 'reveal') onSetLens({ ...lens, mode: lens.mode === 'strict' ? 'context' : 'strict' } as Lens);
        }}>
          {scopeMode === 'strict' ? 'Strict scope' : 'Keep context'}
        </button>
      </div>

      <div className="reveal-controls">
        <input aria-label="Reveal query" placeholder="Reveal across the universe…" value={revealQuery} onChange={(event) => onRevealQueryChange(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') onReveal(); }} />
        <button className="ghost-button" onClick={onReveal}>Reveal</button>
        <button className="ghost-button" onClick={onRevealPrev} disabled={revealMatchCount < 2}>‹</button>
        <button className="ghost-button" onClick={onRevealNext} disabled={revealMatchCount < 2}>›</button>
      </div>

      <button className="ghost-button recall-capture-toggle" onClick={onWhereWasI}>Where was I?</button>
      <button className="ghost-button recall-capture-toggle" onClick={onOpenComposer}>Capture</button>
    </header>
  );
}
