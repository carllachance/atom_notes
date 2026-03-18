import { Lens, Project } from '../types';

type RecallBandProps = {
  count: number;
  archivedCount: number;
  quickCaptureOpen: boolean;
  lens: Lens;
  projects: Project[];
  activeProjectId: string | null;
  projectIsolate: boolean;
  revealQuery: string;
  revealMatchCount: number;
  onSetLens: (lens: Lens) => void;
  onSetProjectReveal: (projectId: string | null) => void;
  onSetProjectIsolation: (isolate: boolean) => void;
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
  projects,
  activeProjectId,
  projectIsolate,
  revealQuery,
  revealMatchCount,
  onSetLens,
  onSetProjectReveal,
  onSetProjectIsolation,
  onToggleQuickCapture,
  onWhereWasI,
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

      <div className="project-reveal-controls">
        <label className="project-reveal-label" htmlFor="project-reveal-select">
          Project
        </label>
        <select
          id="project-reveal-select"
          value={activeProjectId ?? ''}
          onChange={(event) => onSetProjectReveal(event.target.value || null)}
        >
          <option value="">All projects</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.key} · {project.name}
            </option>
          ))}
        </select>
        <button
          className={`ghost-button ${projectIsolate ? 'active' : ''}`}
          disabled={!activeProjectId}
          onClick={() => onSetProjectIsolation(!projectIsolate)}
        >
          {projectIsolate ? 'Show context' : 'Only project'}
        </button>
      </div>

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
