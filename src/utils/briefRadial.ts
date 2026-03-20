// Brief radial layout utility — pure functions, no React
import { BriefSectionData } from '../components/brief/BriefSection';

export interface RadialSection {
  sectionId: string;
  label: string;
  arcStartAngle: number;  // degrees
  arcEndAngle: number;    // degrees
  innerRadius: number;
  outerRadius: number;
  color: string;
  opacity: number;
  noteCount: number;
  hasActionChip: boolean;
}

const SECTION_COLORS: Record<string, string> = {
  stale_flag:         '#F87171',
  upcoming_context:   '#F4B942',
  synthesis_ready:    '#A78BFA',
  document_processed: '#7EB8F7',
  active_cluster:     '#A78BFA',
};

const SECTION_OPACITY: Record<string, number> = {
  stale_flag:         0.85,
  upcoming_context:   0.85,
  active_cluster:     0.55,
  synthesis_ready:    0.70,
  document_processed: 0.60,
};

const GAP_DEGREES = 8;

export function computeBriefRadialLayout(params: {
  sections: BriefSectionData[];
  centerX: number;
  centerY: number;
  baseInnerRadius?: number;
  ringDepth?: number;
}): RadialSection[] {
  const { sections, centerX: _cx, centerY: _cy, baseInnerRadius = 60, ringDepth = 45 } = params;

  if (sections.length === 0) return [];

  const totalGap = GAP_DEGREES * sections.length;
  const totalArc = 360 - totalGap;
  const arcPerSection = totalArc / sections.length;

  return sections.map((section, index) => {
    const startAngle = index * (arcPerSection + GAP_DEGREES);
    const endAngle = startAngle + arcPerSection;
    const isHighPriority = section.sectionType === 'stale_flag' || section.sectionType === 'upcoming_context';
    const depth = isHighPriority ? ringDepth * 1.2 : ringDepth;

    return {
      sectionId: section.id,
      label: section.label,
      arcStartAngle: startAngle,
      arcEndAngle: endAngle,
      innerRadius: baseInnerRadius,
      outerRadius: baseInnerRadius + depth,
      color: SECTION_COLORS[section.sectionType] ?? '#4A4858',
      opacity: SECTION_OPACITY[section.sectionType] ?? 0.60,
      noteCount: section.items.length,
      hasActionChip: section.hasActionChip ?? false,
    };
  });
}
