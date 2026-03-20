import { RelationshipType } from '../types';

interface QuadrantFilter {
  label: string;
  types: RelationshipType[];
  indicator: string;
  colorVar: string;
}

const QUADRANTS: QuadrantFilter[] = [
  {
    label: 'Tasks',
    types: ['depends_on', 'leads_to'],
    indicator: '▲',
    colorVar: 'var(--rel-task)',
  },
  {
    label: 'Sources',
    types: ['references', 'derived_from'],
    indicator: '▶',
    colorVar: 'var(--rel-reference)',
  },
  {
    label: 'Ideas',
    types: ['related', 'supports'],
    indicator: '▼',
    colorVar: 'var(--rel-conceptual)',
  },
  {
    label: 'Conflicts',
    types: ['contradicts'],
    indicator: '◀',
    colorVar: 'var(--rel-conflict)',
  },
];

interface RelationshipStripProps {
  activeFilter: RelationshipType | null;
  onFilterChange: (filter: RelationshipType | null) => void;
}

export function RelationshipStrip({ activeFilter, onFilterChange }: RelationshipStripProps) {
  function isQuadrantActive(quadrant: QuadrantFilter): boolean {
    return quadrant.types.some((t) => t === activeFilter);
  }

  function handleQuadrantClick(quadrant: QuadrantFilter) {
    const firstType = quadrant.types[0];
    const isActive = isQuadrantActive(quadrant);
    onFilterChange(isActive ? null : firstType);
  }

  return (
    <div className="relationship-strip">
      <div className="relationship-strip__quadrants">
        {QUADRANTS.map((q) => {
          const active = isQuadrantActive(q);
          return (
            <button
              key={q.label}
              className={`relationship-strip__btn${active ? ' relationship-strip__btn--active' : ''}`}
              style={{ color: active ? q.colorVar : undefined }}
              onClick={() => handleQuadrantClick(q)}
              title={`Filter by ${q.label.toLowerCase()} (${q.types.join(', ')})`}
            >
              <span className="relationship-strip__indicator" style={{ color: q.colorVar }}>
                {q.indicator}
              </span>
              <span className="relationship-strip__label">{q.label}</span>
            </button>
          );
        })}
      </div>
      <button
        className={`relationship-strip__btn relationship-strip__btn--history${activeFilter === null ? '' : ''}`}
        onClick={() => onFilterChange(null)}
        title="Show all relationships"
      >
        All
      </button>
    </div>
  );
}
