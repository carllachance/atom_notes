import { Relationship, RelationshipType } from '../types';

export type SemanticRelationshipCategory = 'direct' | 'inferred';
export type RelationshipVisualCategory = SemanticRelationshipCategory | 'project';
export type RelationshipVisualEmphasis = 'default' | 'hovered' | 'selected';
export type ProjectNoteVisualState = 'none' | 'member' | 'subordinate';

/**
 * Visual legend for maintainers:
 * - direct: explicit note-to-note meaning; solid, slightly heavier, clearer chip treatment.
 * - inferred: contextual/system-suggested meaning; dashed, lighter, softer chip treatment.
 * - project: non-semantic family grouping; broad ambient ribbons + note halos, never semantic edge styling.
 *
 * Color still communicates relationship subtype, but category meaning must survive without color.
 */
export const RELATIONSHIP_VISUAL_TOKENS = {
  semanticPalette: {
    related_concept: {
      edge: 'rgba(113, 162, 255, 0.44)',
      nodeBorder: 'rgba(145, 182, 255, 0.34)',
      nodeGlow: 'rgba(90, 137, 227, 0.22)'
    },
    references: {
      edge: 'rgba(177, 132, 255, 0.46)',
      nodeBorder: 'rgba(206, 173, 255, 0.34)',
      nodeGlow: 'rgba(146, 103, 225, 0.22)'
    }
  } satisfies Record<RelationshipType, { edge: string; nodeBorder: string; nodeGlow: string }>,
  semantic: {
    direct: {
      label: 'Direct',
      edge: {
        strokeWidth: 2.2,
        dasharray: 'none',
        baseOpacity: 0.28,
        scoreOpacityRange: 0.2,
        maxOpacity: 0.52,
        blurRadius: 7
      },
      node: {
        borderStyle: 'solid',
        backgroundOpacity: 0.64,
        labelOpacity: 0.76,
        glowOpacity: 0.18
      }
    },
    inferred: {
      label: 'Context',
      edge: {
        strokeWidth: 1.45,
        dasharray: '7 9',
        baseOpacity: 0.14,
        scoreOpacityRange: 0.13,
        maxOpacity: 0.34,
        blurRadius: 4
      },
      node: {
        borderStyle: 'dashed',
        backgroundOpacity: 0.48,
        labelOpacity: 0.62,
        glowOpacity: 0.1
      }
    }
  },
  project: {
    connector: {
      strokeWidth: 18,
      opacity: 0.22,
      blurRadius: 8,
      dasharray: 'none'
    },
    note: {
      memberOpacityMultiplier: 1,
      memberGlowStrength: 0.22,
      subordinateOpacityMultiplier: 0.74,
      subordinateScale: 0.985
    }
  },
  emphasis: {
    default: {
      edgeOpacityMultiplier: 1,
      nodeOpacityMultiplier: 1,
      glowOpacityMultiplier: 1
    },
    hovered: {
      edgeOpacityMultiplier: 1.12,
      nodeOpacityMultiplier: 1.08,
      glowOpacityMultiplier: 1.12
    },
    selected: {
      edgeOpacityMultiplier: 1.22,
      nodeOpacityMultiplier: 1.14,
      glowOpacityMultiplier: 1.18
    }
  }
} as const;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function getSemanticRelationshipCategory(relationship: Relationship): SemanticRelationshipCategory {
  return relationship.explicitness === 'explicit' ? 'direct' : 'inferred';
}

export function getSemanticRelationshipVisual(relationship: Relationship, score: number, emphasis: RelationshipVisualEmphasis = 'default') {
  const category = getSemanticRelationshipCategory(relationship);
  const palette = RELATIONSHIP_VISUAL_TOKENS.semanticPalette[relationship.type];
  const semanticTokens = RELATIONSHIP_VISUAL_TOKENS.semantic[category];
  const emphasisTokens = RELATIONSHIP_VISUAL_TOKENS.emphasis[emphasis];

  return {
    category,
    label: semanticTokens.label,
    edge: {
      stroke: palette.edge,
      strokeWidth: semanticTokens.edge.strokeWidth,
      dasharray: semanticTokens.edge.dasharray,
      blurRadius: semanticTokens.edge.blurRadius,
      opacity: clamp(
        (semanticTokens.edge.baseOpacity + score * semanticTokens.edge.scoreOpacityRange) * emphasisTokens.edgeOpacityMultiplier,
        0,
        semanticTokens.edge.maxOpacity
      )
    },
    node: {
      borderColor: palette.nodeBorder,
      glowColor: palette.nodeGlow,
      borderStyle: semanticTokens.node.borderStyle,
      backgroundOpacity: semanticTokens.node.backgroundOpacity * emphasisTokens.nodeOpacityMultiplier,
      labelOpacity: semanticTokens.node.labelOpacity,
      glowOpacity: semanticTokens.node.glowOpacity * emphasisTokens.glowOpacityMultiplier
    }
  };
}

export function getProjectGroupingVisual() {
  return RELATIONSHIP_VISUAL_TOKENS.project;
}

export function getProjectNoteVisual(state: ProjectNoteVisualState) {
  if (state === 'member') {
    return {
      opacityMultiplier: RELATIONSHIP_VISUAL_TOKENS.project.note.memberOpacityMultiplier,
      scaleMultiplier: 1,
      glowStrength: RELATIONSHIP_VISUAL_TOKENS.project.note.memberGlowStrength
    };
  }

  if (state === 'subordinate') {
    return {
      opacityMultiplier: RELATIONSHIP_VISUAL_TOKENS.project.note.subordinateOpacityMultiplier,
      scaleMultiplier: RELATIONSHIP_VISUAL_TOKENS.project.note.subordinateScale,
      glowStrength: 0
    };
  }

  return {
    opacityMultiplier: 1,
    scaleMultiplier: 1,
    glowStrength: 0
  };
}
