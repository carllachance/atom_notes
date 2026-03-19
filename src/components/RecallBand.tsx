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
  onRevealQueryChange: (query: string) => void;
  onReveal: () => void;
  onRevealNext: () => void;
  onRevealPrev: () => void;
  recallCue: { noteTitle: string; suggestedNextStep: string } | null;
  onAdvanceRecallCue: () => void;
  onClearRecallCue: () => void;
  demoLinks?: Array<{
    href: string;
    label: string;
  }>;
};

function describeFocusState(focusMode: FocusMode, focusCount: number) {
  if (focusMode.isolate) {
    return `${focusCount} Focus notes shown globally. Non-Focus notes are hidden until Focus only is turned off.`;
  }

  if (focusMode.highlight) {
    return `${focusCount} Focus notes stay visibly marked across the canvas. Turn off Highlight Focus to soften the extra emphasis, not to remove the Focus state.`;
  }

  return `${focusCount} Focus notes remain tagged, but without extra canvas emphasis.`;
}

function CaptureIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 3.4v9.2M3.4 8h9.2" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.35" />
    </svg>
  );
}

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
  onRevealQueryChange,
  onReveal,
  onRevealNext,
  onRevealPrev,
  recallCue,
  onAdvanceRecallCue,
  onClearRecallCue,
  demoLinks = []
}: RecallBandProps) {
  const activeProjectId = lens.kind === 'project' || lens.kind === 'reveal' ? lens.projectId ?? '' : '';
  const activeWorkspaceId = lens.kind === 'workspace' || lens.kind === 'reveal' ? lens.workspaceId ?? '' : '';
  const scopeMode = lens.kind === 'project' || lens.kind === 'workspace' || lens.kind === 'reveal' ? lens.mode : 'context';
  const focusState = describeFocusState(focusMode, focusCount);

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

      {recallCue ? (
        <div className="recall-resume" aria-live="polite">
          <button
            type="button"
            className="recall-resume-chip"
            onClick={onAdvanceRecallCue}
            title={recallCue.suggestedNextStep}
            aria-label={`Continue ${recallCue.noteTitle}. ${recallCue.suggestedNextStep}`}
          >
            <span className="recall-resume-chip__label">Where was I</span>
            <span className="recall-resume-chip__title">{recallCue.noteTitle}</span>
          </button>
          <button
            type="button"
            className="recall-resume-dismiss"
            onClick={onClearRecallCue}
            aria-label="Dismiss resume suggestion"
            title="Dismiss"
          >
            ×
          </button>
        </div>
      ) : null}

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

      <div className="focus-state-indicator" aria-live="polite">
        <span className="active-lens-label">Focus filter</span>
        <strong>{focusMode.isolate ? 'Focus only' : focusMode.highlight ? 'Highlight Focus' : 'Focus tags only'}</strong>
        <small>{focusState}</small>
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

      {demoLinks.map((link) => (
        <a key={link.href} className="ghost-button recall-capture-toggle recall-demo-link" href={link.href}>
          {link.label}
        </a>
      ))}
      <button className="ghost-button recall-capture-toggle recall-capture-toggle--icon" onClick={onOpenComposer} aria-label="Capture note" title="Capture note">
        <CaptureIcon />
      </button>
    </header>
  );
}
