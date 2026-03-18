import { useMemo } from 'react';
import { NoteCardModel, ProjectModel } from '../types';

type ProjectRevealLayerProps = {
  project: ProjectModel | null;
  notes: NoteCardModel[];
};

const NOTE_CARD_WIDTH = 270;
const NOTE_CARD_HEIGHT = 124;
const MAX_CONNECTORS = 6;

function toRgba(hex: string, alpha: number) {
  const safe = hex.replace('#', '');
  const value = safe.length === 6 ? safe : '89a8ff';
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getNoteCenter(note: NoteCardModel) {
  return {
    x: note.x + NOTE_CARD_WIDTH / 2,
    y: note.y + NOTE_CARD_HEIGHT / 2
  };
}

export function ProjectRevealLayer({ project, notes }: ProjectRevealLayerProps) {
  const geometry = useMemo(() => {
    if (!project || notes.length === 0) return null;

    const centers = notes.map((note) => ({ note, ...getNoteCenter(note) }));
    const centroid = centers.reduce(
      (acc, point) => ({ x: acc.x + point.x / centers.length, y: acc.y + point.y / centers.length }),
      { x: 0, y: 0 }
    );
    const sorted = centers
      .map((point) => ({
        ...point,
        angle: Math.atan2(point.y - centroid.y, point.x - centroid.x),
        distance: Math.hypot(point.x - centroid.x, point.y - centroid.y)
      }))
      .sort((a, b) => a.angle - b.angle);

    const stride = Math.max(1, Math.ceil(sorted.length / MAX_CONNECTORS));
    const connectors = sorted.filter((_, index) => index % stride === 0).slice(0, MAX_CONNECTORS);

    return {
      centroid,
      centers,
      connectors
    };
  }, [notes, project]);

  if (!project || !geometry) return null;

  return (
    <div className="project-reveal-layer" aria-hidden="true">
      <svg className="project-reveal-svg" viewBox="0 0 1800 1100" preserveAspectRatio="none">
        {geometry.centers.map(({ note, x, y }) => (
          <ellipse
            key={`${project.id}-${note.id}-glow`}
            cx={x}
            cy={y}
            rx={178}
            ry={96}
            fill={toRgba(project.color, 0.055)}
          />
        ))}

        {geometry.connectors.map(({ note, x, y }) => {
          const bend = (x - geometry.centroid.x) * 0.12;
          const path = `M ${x} ${y} Q ${geometry.centroid.x + bend} ${(y + geometry.centroid.y) / 2} ${geometry.centroid.x} ${geometry.centroid.y}`;
          return (
            <path
              key={`${project.id}-${note.id}-connector`}
              d={path}
              className="project-connector"
              stroke={toRgba(project.color, 0.16)}
            />
          );
        })}

        <circle
          cx={geometry.centroid.x}
          cy={geometry.centroid.y}
          r={28}
          fill={toRgba(project.color, 0.1)}
          stroke={toRgba(project.color, 0.2)}
          strokeWidth={1}
        />
      </svg>
      <div
        className="project-reveal-label"
        style={{
          transform: `translate(${geometry.centroid.x - 44}px, ${geometry.centroid.y - 18}px)`,
          borderColor: toRgba(project.color, 0.24),
          background: `linear-gradient(160deg, ${toRgba(project.color, 0.16)}, rgba(14, 20, 34, 0.44))`
        }}
      >
        {project.name}
      </div>
    </div>
  );
}
