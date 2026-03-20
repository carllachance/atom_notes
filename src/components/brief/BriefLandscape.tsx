import { useEffect, useRef, useState } from 'react';
import { BriefSectionData } from './BriefSection';
import { computeBriefRadialLayout, RadialSection } from '../../utils/briefRadial';
import './BriefLandscape.css';

interface BriefLandscapeProps {
  sections: BriefSectionData[];
  greeting: string;
  onSectionClick: (sectionId: string) => void;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function describeArc(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  startDeg: number,
  endDeg: number
): string {
  const start = toRad(startDeg - 90);
  const end = toRad(endDeg - 90);
  const x1 = cx + outerR * Math.cos(start);
  const y1 = cy + outerR * Math.sin(start);
  const x2 = cx + outerR * Math.cos(end);
  const y2 = cy + outerR * Math.sin(end);
  const x3 = cx + innerR * Math.cos(end);
  const y3 = cy + innerR * Math.sin(end);
  const x4 = cx + innerR * Math.cos(start);
  const y4 = cy + innerR * Math.sin(start);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return [
    `M ${x1} ${y1}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2}`,
    `L ${x3} ${y3}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4} ${y4}`,
    'Z',
  ].join(' ');
}

export function BriefLandscape({ sections, greeting, onSectionClick }: BriefLandscapeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [entering, setEntering] = useState(true);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setSize({ w: width, h: height });
    });
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  // Fade-in on mount
  useEffect(() => {
    const id = requestAnimationFrame(() => setEntering(false));
    return () => cancelAnimationFrame(id);
  }, []);

  const cx = size.w / 2;
  const cy = size.h / 2;

  const radialSections = computeBriefRadialLayout({
    sections,
    centerX: cx,
    centerY: cy,
  });

  return (
    <div
      ref={containerRef}
      className={`brief-landscape${entering ? ' brief-landscape--entering' : ''}`}
    >
      <svg width={size.w} height={size.h}>
        {radialSections.map((section) => {
          const midAngle = (section.arcStartAngle + section.arcEndAngle) / 2;
          const labelRadius = section.outerRadius + 20;
          const labelRad = toRad(midAngle - 90);
          const lx = cx + labelRadius * Math.cos(labelRad);
          const ly = cy + labelRadius * Math.sin(labelRad);

          const dotRad = toRad(midAngle - 90);
          const dotR = section.outerRadius;
          const dotX = cx + dotR * Math.cos(dotRad);
          const dotY = cy + dotR * Math.sin(dotRad);

          return (
            <g key={section.sectionId} onClick={() => onSectionClick(section.sectionId)}>
              <path
                d={describeArc(cx, cy, section.innerRadius, section.outerRadius, section.arcStartAngle, section.arcEndAngle)}
                fill={section.color}
                opacity={section.opacity}
                className="brief-landscape__arc"
              />
              <text
                x={lx}
                y={ly}
                textAnchor="middle"
                fill="var(--text-secondary)"
                fontSize={11}
                fontFamily="var(--font-stack)"
                style={{ pointerEvents: 'none' }}
              >
                {section.label}
              </text>
              {section.hasActionChip && (
                <circle cx={dotX} cy={dotY} r={4} fill="var(--rel-conceptual)" opacity={0.8} style={{ pointerEvents: 'none' }} />
              )}
            </g>
          );
        })}

        {/* Center greeting */}
        <text
          x={cx}
          y={cy - 10}
          textAnchor="middle"
          fill="var(--text-primary)"
          fontSize={18}
          fontFamily="var(--font-stack)"
          fontWeight={300}
        >
          {greeting}
        </text>
        <text
          x={cx}
          y={cy + 14}
          textAnchor="middle"
          fill="var(--text-tertiary)"
          fontSize={11}
          fontFamily="var(--font-stack)"
        >
          {sections.length} active {sections.length === 1 ? 'section' : 'sections'}
        </text>
      </svg>
    </div>
  );
}
