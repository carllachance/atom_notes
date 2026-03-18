import { Lens } from '../types';

type ProjectSummary = {
  id: string;
  name: string;
  color: string;
  noteCount: number;
};

type RecallBandProps = {
  count: number;
  archivedCount: number;
  quickCaptureOpen: boolean;
  lens: Lens;
  revealQuery: string;
  revealMatchCount: number;
  projects: ProjectSummary[];
  activeProjectId: string | null;
  onSetLens: (lens: Lens) => void;
  onSetProjectReveal: (projectId: string | null) => void;
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
  lens,
  revealQuery,
  revealMatchCount,
  projects,
  activeProjectId,
  onSetLens,
  onSetProjectReveal,
  onToggleQuickCapture,
  onWhereWasI,
  onRevealQueryChange,
  onReveal,
  onRevealNext,
  onRevealPrev
}: RecallBandProps) {
  const featuredProjects = projects.slice(0, 4);

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

      <div className="project-reveal-controls">
        <select
          aria-label="Reveal project"
          value={activeProjectId ?? ''}
          onChange={(event) => onSetProjectReveal(event.target.value || null)}
        >
          <option value="">Reveal project…</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name} · {project.noteCount}
            </option>
          ))}
        </select>
        {activeProjectId ? (
          <button className="ghost-button" onClick={() => onSetProjectReveal(null)}>
            Clear project
          </button>
        ) : null}
      </div>

      {featuredProjects.length ? (
        <div className="project-pill-row" aria-label="Project shortcuts">
          {featuredProjects.map((project) => (
            <button
              key={project.id}
              className={project.id === activeProjectId ? 'project-pill active' : 'project-pill'}
              style={{ ['--project-accent' as string]: project.color }}
              onClick={() => onSetProjectReveal(project.id === activeProjectId ? null : project.id)}
            >
              {project.name}
              <span>{project.noteCount}</span>
            </button>
          ))}
        </div>
      ) : null}

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

      <button className="ghost-button recall-capture-toggle" onClick={onWhereWasI}>
        Where was I?
      </button>
      <button className="ghost-button recall-capture-toggle" onClick={onToggleQuickCapture}>
        {quickCaptureOpen ? 'Close capture' : 'Open capture'}
      </button>
    </header>
  );
}
