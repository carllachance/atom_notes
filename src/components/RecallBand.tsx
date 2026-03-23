import { useState } from 'react';
import { FocusMode, Lens, Project, Workspace } from '../types';

type RecallBandProps = {
  count: number;
  totalCount: number;
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
  onResetView: () => void;
  onFitAllNotes: () => void;
  onClearFocus: () => void;
  onClearFilters: () => void;
  canClearFocus: boolean;
  canClearFilters: boolean;
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

// Primary Zone - Always visible, core actions only
function RecallBandPrimaryZone({
  count,
  totalCount,
  canClearFilters,
  onClearFilters,
  onOpenComposer
}: {
  count: number;
  totalCount: number;
  canClearFilters: boolean;
  onClearFilters: () => void;
  onOpenComposer: () => void;
}) {
  return (
    <div className="recall-band__primary-zone">
      <div className="recall-band__note-count">
        <span className="count-value">{count}</span>
        <span className="count-label">notes</span>
        {totalCount !== count && (
          <span className="count-total">of {totalCount}</span>
        )}
      </div>
      <div className="recall-band__primary-actions">
        {canClearFilters && (
          <button
            className="ghost-button primary-action"
            onClick={onClearFilters}
          >
            Show all notes
          </button>
        )}
        <button
          className="ghost-button capture-button"
          onClick={onOpenComposer}
          aria-label="Capture note"
          title="Capture note"
        >
          <CaptureIcon />
          <span>Capture</span>
        </button>
      </div>
    </div>
  );
}

// Scope Zone - Shows lens navigation when not in Universe view
function RecallBandScopeZone({
  lens,
  lensLabel,
  projects,
  workspaces,
  onSetLens
}: {
  lens: Lens;
  lensLabel: string;
  projects: Project[];
  workspaces: Workspace[];
  onSetLens: (lens: Lens) => void;
}) {
  const activeProjectId = lens.kind === 'project' || lens.kind === 'reveal' ? lens.projectId ?? '' : '';
  const activeWorkspaceId = lens.kind === 'workspace' || lens.kind === 'reveal' ? lens.workspaceId ?? '' : '';
  const scopeMode = lens.kind === 'project' || lens.kind === 'workspace' || lens.kind === 'reveal' ? lens.mode : 'context';

  const isActive = lens.kind !== 'universe' && lens.kind !== 'archive';

  if (!isActive) return null;

  return (
    <div className="recall-band__scope-zone" data-visible={isActive ? 'true' : 'false'}>
      <nav className="view-switch" aria-label="Lens selection">
        <button className="" onClick={() => onSetLens({ kind: 'universe' })}>
          Universe
        </button>
        <button className={lens.kind === 'project' ? 'active' : ''} onClick={() => onSetLens({ kind: 'project', projectId: activeProjectId || (projects[0]?.id ?? null), mode: scopeMode })}>
          Project
        </button>
        <button className={lens.kind === 'workspace' ? 'active' : ''} onClick={() => onSetLens({ kind: 'workspace', workspaceId: activeWorkspaceId || (workspaces[0]?.id ?? null), mode: scopeMode })}>
          Workspace
        </button>
      </nav>
      <span className="active-lens-badge">{lensLabel}</span>
    </div>
  );
}

// Filters Zone - Collapsed by default, expands to show focus/filter controls
function RecallBandFiltersZone({
  lens,
  focusMode,
  focusCount,
  projects,
  workspaces,
  revealQuery,
  revealMatchCount,
  canClearFocus,
  onSetLens,
  onSetFocusMode,
  onRevealQueryChange,
  onReveal,
  onRevealNext,
  onRevealPrev,
  onClearFocus,
  onResetView,
  onFitAllNotes
}: {
  lens: Lens;
  focusMode: FocusMode;
  focusCount: number;
  projects: Project[];
  workspaces: Workspace[];
  revealQuery: string;
  revealMatchCount: number;
  canClearFocus: boolean;
  onSetLens: (lens: Lens) => void;
  onSetFocusMode: (updates: Partial<FocusMode>) => void;
  onRevealQueryChange: (query: string) => void;
  onReveal: () => void;
  onRevealNext: () => void;
  onRevealPrev: () => void;
  onClearFocus: () => void;
  onResetView: () => void;
  onFitAllNotes: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const activeProjectId = lens.kind === 'project' || lens.kind === 'reveal' ? lens.projectId ?? '' : '';
  const activeWorkspaceId = lens.kind === 'workspace' || lens.kind === 'reveal' ? lens.workspaceId ?? '' : '';
  const scopeMode = lens.kind === 'project' || lens.kind === 'workspace' || lens.kind === 'reveal' ? lens.mode : 'context';

  const hasActiveFilters = focusMode.highlight || focusMode.isolate || revealQuery;

  return (
    <div className="recall-band__filters-zone">
      <button
        className={`ghost-button filters-toggle ${hasActiveFilters ? 'has-active-filters' : ''}`}
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-controls="filters-panel"
      >
        Filters
        {hasActiveFilters && <span className="filters-active-dot" />}
      </button>

      {expanded && (
        <div id="filters-panel" className="filters-panel">
          {/* Archive lens toggle */}
          <div className="filters-section">
            <label className="filters-section-label">View</label>
            <div className="view-switch">
              <button className={lens.kind === 'universe' ? 'active' : ''} onClick={() => onSetLens({ kind: 'universe' })}>
                Universe
              </button>
              <button className={lens.kind === 'archive' ? 'active' : ''} onClick={() => onSetLens({ kind: 'archive' })}>
                Archive
              </button>
            </div>
          </div>

          {/* Focus controls */}
          <div className="filters-section">
            <label className="filters-section-label">Focus</label>
            <div className="focus-controls">
              <button
                className={`ghost-button ${focusMode.highlight ? 'active' : ''}`}
                onClick={() => onSetFocusMode({ highlight: !focusMode.highlight })}
              >
                Highlight Focus
              </button>
              <button
                className={`ghost-button ${focusMode.isolate ? 'active' : ''}`}
                onClick={() => onSetFocusMode({ isolate: !focusMode.isolate })}
              >
                Focus only
              </button>
              <span className="focus-count-chip">{focusCount} Focus</span>
            </div>
          </div>

          {/* Project selector */}
          <div className="filters-section">
            <label className="project-reveal-label" htmlFor="project-lens-select">Project</label>
            <select
              id="project-lens-select"
              value={activeProjectId}
              onChange={(event) => onSetLens(event.target.value ? { kind: 'project', projectId: event.target.value, mode: scopeMode } : { kind: 'universe' })}
            >
              <option value="">All projects</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.key} · {project.name}</option>)}
            </select>
          </div>

          {/* Workspace selector */}
          <div className="filters-section">
            <label className="project-reveal-label" htmlFor="workspace-lens-select">Workspace</label>
            <select
              id="workspace-lens-select"
              value={activeWorkspaceId}
              onChange={(event) => onSetLens(event.target.value ? { kind: 'workspace', workspaceId: event.target.value, mode: scopeMode } : { kind: 'universe' })}
            >
              <option value="">All workspaces</option>
              {workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.key} · {workspace.name}</option>)}
            </select>
          </div>

          {/* Reveal controls */}
          <div className="filters-section">
            <label className="filters-section-label">Reveal</label>
            <div className="reveal-controls">
              <input
                aria-label="Reveal query"
                placeholder="Search notes…"
                value={revealQuery}
                onChange={(event) => onRevealQueryChange(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Enter') onReveal(); }}
              />
              <button className="ghost-button" onClick={onReveal}>Reveal</button>
              <button className="ghost-button" onClick={onRevealPrev} disabled={revealMatchCount < 2}>‹</button>
              <button className="ghost-button" onClick={onRevealNext} disabled={revealMatchCount < 2}>›</button>
            </div>
          </div>

          {/* Canvas recovery */}
          <div className="filters-section canvas-recovery-controls">
            <label className="filters-section-label">Canvas</label>
            <div className="canvas-actions">
              <button className="ghost-button" onClick={onResetView}>Reset view</button>
              <button className="ghost-button" onClick={onFitAllNotes}>Fit all notes</button>
              <button className="ghost-button" onClick={onClearFocus} disabled={!canClearFocus}>Clear focus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function RecallBand({
  count,
  totalCount,
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
  onResetView,
  onFitAllNotes,
  onClearFocus,
  onClearFilters,
  canClearFocus,
  canClearFilters,
  recallCue,
  onAdvanceRecallCue,
  onClearRecallCue,
  demoLinks = []
}: RecallBandProps) {
  const focusState = describeFocusState(focusMode, focusCount);

  return (
    <header className="recall-band">
      {/* Primary Zone - Always visible */}
      <RecallBandPrimaryZone
        count={count}
        totalCount={totalCount}
        canClearFilters={canClearFilters}
        onClearFilters={onClearFilters}
        onOpenComposer={onOpenComposer}
      />

      {/* Scope Zone - Shows lens navigation when not Universe/Archive */}
      <RecallBandScopeZone
        lens={lens}
        lensLabel={lensLabel}
        projects={projects}
        workspaces={workspaces}
        onSetLens={onSetLens}
      />

      {/* Recall cue - persists in the band */}
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

      {/* Filters Zone - Collapsed by default */}
      <RecallBandFiltersZone
        lens={lens}
        focusMode={focusMode}
        focusCount={focusCount}
        projects={projects}
        workspaces={workspaces}
        revealQuery={revealQuery}
        revealMatchCount={revealMatchCount}
        canClearFocus={canClearFocus}
        onSetLens={onSetLens}
        onSetFocusMode={onSetFocusMode}
        onRevealQueryChange={onRevealQueryChange}
        onReveal={onReveal}
        onRevealNext={onRevealNext}
        onRevealPrev={onRevealPrev}
        onClearFocus={onClearFocus}
        onResetView={onResetView}
        onFitAllNotes={onFitAllNotes}
      />

      {/* Focus state indicator */}
      <div className="focus-state-indicator" aria-live="polite">
        <span className="active-lens-label">Focus filter</span>
        <strong>{focusMode.isolate ? 'Focus only' : focusMode.highlight ? 'Highlight Focus' : 'Focus tags only'}</strong>
        <small>{focusState}</small>
      </div>

      {/* Demo links */}
      {demoLinks.map((link) => (
        <a key={link.href} className="ghost-button recall-demo-link" href={link.href}>
          {link.label}
        </a>
      ))}
    </header>
  );
}
