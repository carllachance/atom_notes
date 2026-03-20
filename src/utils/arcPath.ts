// Bézier arc and relationship visual props — pure geometry, no React

export interface Point {
  x: number;
  y: number;
}

export function computeArcPath(from: Point, to: Point, curvature = 0.2): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance === 0) {
    return `M ${from.x} ${from.y}`;
  }

  const midpoint = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
  const perpUnit = { x: -dy / distance, y: dx / distance };
  const control = {
    x: midpoint.x + perpUnit.x * distance * curvature,
    y: midpoint.y + perpUnit.y * distance * curvature,
  };

  return `M ${from.x} ${from.y} Q ${control.x} ${control.y} ${to.x} ${to.y}`;
}

export interface RelationshipVisualProps {
  color: string;
  strokeWidth: number;
  opacity: number;
  strokeDasharray: string;
}

export function computeRelationshipVisualProps(rel: {
  type: string;
  explicitness: string;
  lifecycle_state: string;
  reinforcement_score: number;
}): RelationshipVisualProps {
  // Color by type
  let color: string;
  switch (rel.type) {
    case 'task_dependency':
    case 'action_source':
      color = '#F4B942';
      break;
    case 'references':
    case 'derived_from':
      color = '#7EB8F7';
      break;
    case 'related_concept':
    case 'same_entity':
      color = '#A78BFA';
      break;
    case 'conflicts_with':
    case 'duplicate_of':
      color = '#F87171';
      break;
    case 'parent_child':
    case 'supersedes':
      color = '#5EEAD4';
      break;
    default:
      color = '#4A4858';
  }

  // Stroke width: linear map reinforcement_score [0,1] → [0.8, 2.5]
  const strokeWidth = 0.8 + rel.reinforcement_score * 1.7;

  // Opacity by lifecycle state
  let opacity: number;
  switch (rel.lifecycle_state) {
    case 'active':
      opacity = 0.70;
      break;
    case 'confirmed':
      opacity = 0.55;
      break;
    case 'cooling':
      opacity = 0.30;
      break;
    case 'historical':
      opacity = 0.12;
      break;
    case 'proposed':
      opacity = 0.20;
      break;
    default:
      opacity = 0.15;
  }

  // Stroke dash: lifecycle overrides explicitness for historical/cooling
  let strokeDasharray: string;
  if (rel.lifecycle_state === 'historical' || rel.lifecycle_state === 'cooling') {
    strokeDasharray = '2 4';
  } else if (rel.explicitness === 'inferred') {
    strokeDasharray = '5 3';
  } else {
    strokeDasharray = '';
  }

  return { color, strokeWidth, opacity, strokeDasharray };
}
