import { useState } from 'react';
import { FocusMode, Lens, Project, Workspace } from '../types';
import { HistoryStackEntry, StateSnapshot } from '../types/reeentory';

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
  // DG-2 Re-entry surface props (AN-007, AN-008, AN-009)
  historyStack: HistoryStackEntry[];
  bookmarks: StateSnapshot[];
  memorySummary: string | null;
  memorySummarySource: 'ai-generated' | 'ai-inferred' | null;
  reentryExpanded: boolean;
  onToggleReentry: () => void;
  onRestoreHistory: (entry: HistoryStackEntry) => void;
  onDropPin: (label: string) => void;
  onRestoreBookmark: (bookmark: StateSnapshot) => void;
  browseSurface: 'shelf' | 'canvas';
  onBrowseSurfaceChange: (surface: 'shelf' | 'canvas') => void;
  horizonOpen: boolean;
  onToggleHorizon: () => void;
  noteOpen: boolean;
};

function summarizeActiveFilters(
  focusMode: FocusMode,
  lens: Lens,
  projects: Project[],
  workspaces: Workspace[],
  revealQuery: string
): string | null {
  const summaryTokens: string[] = [];

  if (focusMode.isolate) {
    summaryTokens.push('Focus only');
  } else if (focusMode.highlight) {
    summaryTokens.push('Highlight Focus');
  }

  if (lens.kind === 'project' || lens.kind === 'reveal') {
    if (lens.projectId) {
      const activeProject = projects.find((project) => project.id === lens.projectId);
      summaryTokens.push(`Project: ${activeProject?.name ?? 'Unknown'}`);
    }
  }

  if (lens.kind === 'workspace' || lens.kind === 'reveal') {
    if (lens.workspaceId) {
      const activeWorkspace = workspaces.find((workspace) => workspace.id === lens.workspaceId);
      summaryTokens.push(`Workspace: ${activeWorkspace?.name ?? 'Unknown'}`);
    }
  }

  if (revealQuery.trim()) {
    summaryTokens.push(`Search: ${revealQuery.trim()}`);
  }

  return summaryTokens.length ? summaryTokens.join(' · ') : null;
}

function CaptureIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 3.4v9.2M3.4 8h9.2" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.35" />
    </svg>
  );
}

// DG-2 AN-007, AN-008, AN-009: Re-entry Surface Component
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function ReentrySurface({
  history,
  bookmarks,
  memorySummary,
  memorySummarySource,
  isExpanded,
  onToggleReentry,
  onRestoreHistory,
  onDropPin,
  onRestoreBookmark
}: {
  history: HistoryStackEntry[];
  bookmarks: StateSnapshot[];
  memorySummary: string | null;
  memorySummarySource: 'ai-generated' | 'ai-inferred' | null;
  isExpanded: boolean;
  onToggleReentry: () => void;
  onRestoreHistory: (entry: HistoryStackEntry) => void;
  onDropPin: (label: string) => void;
  onRestoreBookmark: (bookmark: StateSnapshot) => void;
}) {
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pinLabel, setPinLabel] = useState('');

  const recentHistory = history.slice(0, 5);
  const hasContent = recentHistory.length > 0 || bookmarks.length > 0 || memorySummary;

  const handleDropPin = () => {
    if (pinLabel.trim()) {
      onDropPin(pinLabel.trim());
      setPinLabel('');
      setShowPinDialog(false);
    }
  };

  return (
    <div className="reentry-surface">
      <button
        className={`ghost-button reentry-toggle ${isExpanded ? 'active' : ''}`}
        onClick={onToggleReentry}
        aria-expanded={isExpanded}
        aria-controls="reentry-panel"
        title="Where was I? - Resume your context"
      >
        <span className="reentry-icon" aria-hidden="true">
          <svg viewBox="0 0 16 16" width="14" height="14">
            <path d="M8 2C4.7 2 2 4.7 2 8s2.7 6 6 6 6-2.7 6-6-2.7-6-6-6zm0 10c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4z" fill="currentColor"/>
            <path d="M8 4.5v3.5l2.5 1.5" fill="none" stroke="currentColor" strokeLinecap="round"/>
          </svg>
        </span>
        <span>Where was I?</span>
      </button>

      {isExpanded && (
        <div id="reentry-panel" className="reentry-panel">
          {memorySummary && (
            <section className="reentry-section">
              <div className="reentry-section-header">
                <span className={`ai-badge ${memorySummarySource === 'ai-generated' ? 'ai-badge-generated' : 'ai-badge-inferred'}`}>
                  {memorySummarySource === 'ai-generated' ? 'AI-generated' : 'AI-inferred'}
                </span>
                <span>summary</span>
              </div>
              <p className="reentry-summary-text">{memorySummary}</p>
              <small className="reentry-summary-note">Based on your recent activity</small>
            </section>
          )}

          {!memorySummary && (
            <section className="reentry-section reentry-section-placeholder">
              <p className="reentry-placeholder-text">
                Open or pin a few notes and a short memory summary will appear here.
              </p>
            </section>
          )}

          {/* Recent History - AN-008 */}
          {recentHistory.length > 0 && (
            <section className="reentry-section">
              <div className="reentry-section-header">
                <span>Recent</span>
              </div>
              <div className="reentry-history-list">
                {recentHistory.map((entry) => (
                  <button
                    key={entry.id}
                    className="reentry-history-item"
                    onClick={() => onRestoreHistory(entry)}
                    title={`Restore to ${entry.noteTitle || 'this point'}`}
                  >
                    <span className="reentry-history-note">
                      {entry.noteTitle || 'Untitled note'}
                    </span>
                    <span className="reentry-history-time">
                      {formatRelativeTime(entry.timestamp)}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Bookmarks / Pins - AN-009 */}
          {bookmarks.length > 0 && (
            <section className="reentry-section">
              <div className="reentry-section-header">
                <span>Pins</span>
              </div>
              <div className="reentry-bookmarks-list">
                {bookmarks.map((bookmark) => (
                  <button
                    key={bookmark.id}
                    className="reentry-bookmark-item"
                    onClick={() => onRestoreBookmark(bookmark)}
                    title={`Restore ${bookmark.label}`}
                  >
                    <span className="reentry-bookmark-icon" aria-hidden="true">📌</span>
                    <span className="reentry-bookmark-label">{bookmark.label}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Drop a Pin - AN-009 */}
          {showPinDialog ? (
            <div className="reentry-pin-dialog">
              <input
                type="text"
                className="reentry-pin-input"
                placeholder="Name this pin..."
                value={pinLabel}
                onChange={(e) => setPinLabel(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleDropPin()}
                autoFocus
              />
              <div className="reentry-pin-actions">
                <button
                  className="ghost-button"
                  onClick={() => setShowPinDialog(false)}
                >
                  Cancel
                </button>
                <button
                  className="ghost-button primary-action"
                  onClick={handleDropPin}
                  disabled={!pinLabel.trim()}
                >
                  Save pin
                </button>
              </div>
            </div>
          ) : (
            <button
              className="ghost-button reentry-drop-pin"
              onClick={() => setShowPinDialog(true)}
            >
              <span aria-hidden="true">📌</span>
              Drop a pin here
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Primary Zone - Always visible, core actions only
function RecallBandPrimaryZone({
  count,
  totalCount,
  canClearFilters,
  onClearFilters,
  onOpenComposer,
  browseSurface,
  onBrowseSurfaceChange,
  showCaptureAction
}: {
  count: number;
  totalCount: number;
  canClearFilters: boolean;
  onClearFilters: () => void;
  onOpenComposer: () => void;
  browseSurface: 'shelf' | 'canvas';
  onBrowseSurfaceChange: (surface: 'shelf' | 'canvas') => void;
  showCaptureAction: boolean;
}) {
  return (
    <div className="recall-band__primary-zone">
      <div className="recall-band__note-count">
        <span className="count-value">{count} notes</span>
        {totalCount !== count && (
          <span className="count-total">of {totalCount}</span>
        )}
      </div>
      <div className="recall-band__primary-actions">
        <nav className="surface-switch" aria-label="Browse surfaces">
          <button type="button" className={browseSurface === 'shelf' ? 'active' : ''} onClick={() => onBrowseSurfaceChange('shelf')}>
            Shelf
          </button>
          <button type="button" className={browseSurface === 'canvas' ? 'active' : ''} onClick={() => onBrowseSurfaceChange('canvas')}>
            Canvas
          </button>
        </nav>
        {canClearFilters && (
          <button
            className="ghost-button primary-action"
            onClick={onClearFilters}
          >
            Show all notes
          </button>
        )}
        {showCaptureAction ? (
          <button
            className="ghost-button capture-button"
            onClick={onOpenComposer}
            aria-label="Capture note"
            title="Capture note"
          >
            <CaptureIcon />
            <span>Capture</span>
          </button>
        ) : null}
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
        aria-label={hasActiveFilters ? 'Filters active' : 'Filters'}
      >
        <span className="filters-toggle-icon" aria-hidden="true">⟡</span>
        <span className="filters-toggle-label">Filters</span>
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
  demoLinks = [],
  // DG-2 Re-entry props
  historyStack = [],
  bookmarks = [],
  memorySummary = null,
  memorySummarySource = null,
  reentryExpanded = false,
  onToggleReentry,
  onRestoreHistory,
  onDropPin,
  onRestoreBookmark,
  browseSurface,
  onBrowseSurfaceChange,
  horizonOpen,
  onToggleHorizon,
  noteOpen
}: RecallBandProps) {
  const activeFilterSummary = summarizeActiveFilters(focusMode, lens, projects, workspaces, revealQuery);
  const showFilterSummary = browseSurface === 'shelf' && Boolean(activeFilterSummary);

  return (
    <header className="recall-band">
      {/* Re-entry Surface - DG-2 AN-007 */}
      <div className="recall-band__utility-cluster">
        <ReentrySurface
          history={historyStack}
          bookmarks={bookmarks}
          memorySummary={memorySummary}
          memorySummarySource={memorySummarySource}
          isExpanded={reentryExpanded}
          onToggleReentry={onToggleReentry}
          onRestoreHistory={onRestoreHistory}
          onDropPin={onDropPin}
          onRestoreBookmark={onRestoreBookmark}
        />
        <button
          type="button"
          className={`ghost-button horizon-utility-button ${horizonOpen ? 'active' : ''}`}
          onClick={onToggleHorizon}
          aria-label={horizonOpen ? 'Close Horizon' : 'Open Horizon'}
          title={horizonOpen ? 'Close Horizon' : 'Open Horizon'}
        >
          <span aria-hidden="true">✦</span>
          <span>Horizon</span>
        </button>
        {demoLinks.map((link) => (
          <a key={link.href} className="ghost-button recall-demo-link" href={link.href}>
            {link.label}
          </a>
        ))}
      </div>

      {/* Primary Zone - Always visible */}
      <RecallBandPrimaryZone
        count={count}
        totalCount={totalCount}
        canClearFilters={canClearFilters}
        onClearFilters={onClearFilters}
        onOpenComposer={onOpenComposer}
        browseSurface={browseSurface}
        onBrowseSurfaceChange={onBrowseSurfaceChange}
        showCaptureAction={!noteOpen && browseSurface === 'shelf'}
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

      {/* Compact filter summary - only when active and relevant to Shelf */}
      {showFilterSummary ? (
        <div className="focus-state-indicator focus-state-indicator--compact" aria-live="polite">
          <small>{activeFilterSummary}</small>
        </div>
      ) : null}
    </header>
  );
}
