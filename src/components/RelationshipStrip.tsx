import { RelationshipType } from '../types';
import { Chip } from './Chip';

interface QuadrantFilter {
  label: string;
  types: RelationshipType[];
  indicator: string;
  variant: 'neutral' | 'status' | 'warning' | 'danger';
}

const QUADRANTS: QuadrantFilter[] = [
  {
    label: 'Tasks',
    types: ['depends_on', 'leads_to'],
    indicator: '▲',
    variant: 'status',
  },
  {
    label: 'Sources',
    types: ['references', 'derived_from'],
    indicator: '▶',
    variant: 'warning',
  },
  {
    label: 'Ideas',
    types: ['related', 'supports'],
    indicator: '▼',
    variant: 'neutral',
  },
  {
    label: 'Conflicts',
    types: ['contradicts'],
    indicator: '◀',
    variant: 'danger',
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
            <Chip
              key={q.label}
              className="relationship-strip__btn"
              onClick={() => handleQuadrantClick(q)}
              title={`Filter by ${q.label.toLowerCase()} (${q.types.join(', ')})`}
              variant={q.variant}
              active={active}
              label={q.label}
              leading={q.indicator}
            />
          );
        })}
      </div>
      <Chip
        className="relationship-strip__btn relationship-strip__btn--history"
        onClick={() => onFilterChange(null)}
        title="Show all relationships"
        variant="neutral"
        active={activeFilter === null}
        label="All"
      />
    </div>
  );
}
