import { AIInteractionMode, RelationshipType } from '../types';

export type RelationshipOptionGroup = 'Core context' | 'Operational flow' | 'Structure';

export type DetailSurfaceRelationshipOption = {
  type: RelationshipType;
  label: string;
  group: RelationshipOptionGroup;
  description: string;
};

export const INSIGHTS_RAIL_MODES: Array<{ mode: AIInteractionMode; label: string; shortLabel: string }> = [
  { mode: 'ask', label: 'Ask', shortLabel: 'A' },
  { mode: 'explore', label: 'Explore', shortLabel: 'E' },
  { mode: 'summarize', label: 'Summarize', shortLabel: 'S' },
  { mode: 'act', label: 'Act', shortLabel: '↗' }
];

export const DETAIL_SURFACE_RELATIONSHIP_OPTIONS: DetailSurfaceRelationshipOption[] = [
  { type: 'related', label: 'Related', group: 'Core context', description: 'Shared concept or nearby idea.' },
  { type: 'references', label: 'References', group: 'Core context', description: 'Source, citation, or supporting artifact.' },
  { type: 'depends_on', label: 'Depends on', group: 'Operational flow', description: 'This note needs the other note first.' },
  { type: 'supports', label: 'Supports', group: 'Operational flow', description: 'Reinforces or enables the other note.' },
  { type: 'contradicts', label: 'Contradicts', group: 'Operational flow', description: 'Signals conflict or inconsistency.' },
  { type: 'leads_to', label: 'Leads to', group: 'Operational flow', description: 'Points toward the next likely result.' },
  { type: 'part_of', label: 'Part of', group: 'Structure', description: 'Places this note inside a larger structure.' },
  { type: 'derived_from', label: 'Derived from', group: 'Structure', description: 'Captures provenance or lineage.' }
];

export function getDetailSurfaceRelationshipOption(type: RelationshipType) {
  return DETAIL_SURFACE_RELATIONSHIP_OPTIONS.find((option) => option.type === type) ?? DETAIL_SURFACE_RELATIONSHIP_OPTIONS[0];
}

export function getRelationshipSummaryItems(relationshipTotals: Record<RelationshipType, number>) {
  return DETAIL_SURFACE_RELATIONSHIP_OPTIONS
    .map((option) => ({ ...option, count: relationshipTotals[option.type] ?? 0 }))
    .filter((option) => option.count > 0);
}

export function getRelationshipsForActiveFilter<T extends { type: RelationshipType }>(
  relationships: T[],
  activeFilter: 'all' | RelationshipType
) {
  if (activeFilter === 'all') return [] as T[];
  return relationships.filter((relationship) => relationship.type === activeFilter);
}
