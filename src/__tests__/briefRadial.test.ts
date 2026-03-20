import test from 'node:test';
import assert from 'node:assert/strict';
import { computeBriefRadialLayout } from '../utils/briefRadial';
import type { BriefSectionData } from '../components/brief/BriefSection';

function makeSection(id: string, type: BriefSectionData['sectionType'], itemCount = 2): BriefSectionData {
  return {
    id,
    sectionType: type,
    label: id,
    summary: `Summary for ${id}`,
    items: Array.from({ length: itemCount }, (_, i) => ({ id: `item-${i}`, title: `Item ${i}` })),
  };
}

const centerParams = { centerX: 500, centerY: 400 };

test('4 sections produces 4 RadialSection objects', () => {
  const sections = [
    makeSection('a', 'stale_flag'),
    makeSection('b', 'upcoming_context'),
    makeSection('c', 'active_cluster'),
    makeSection('d', 'synthesis_ready'),
  ];
  const result = computeBriefRadialLayout({ sections, ...centerParams });
  assert.equal(result.length, 4);
});

test('total angular span of all sections plus gaps equals 360°', () => {
  const sections = [
    makeSection('a', 'stale_flag'),
    makeSection('b', 'active_cluster'),
    makeSection('c', 'synthesis_ready'),
  ];
  const result = computeBriefRadialLayout({ sections, ...centerParams });
  const totalSpan = result.reduce((sum, s) => sum + (s.arcEndAngle - s.arcStartAngle), 0);
  const totalGap = 8 * sections.length;
  assert.ok(Math.abs(totalSpan + totalGap - 360) < 0.01, `Expected ~360, got ${totalSpan + totalGap}`);
});

test('stale_flag section has opacity 0.85', () => {
  const result = computeBriefRadialLayout({
    sections: [makeSection('flag', 'stale_flag')],
    ...centerParams,
  });
  assert.equal(result[0].opacity, 0.85);
});

test('each section arcEndAngle > arcStartAngle', () => {
  const sections = [
    makeSection('a', 'stale_flag'),
    makeSection('b', 'active_cluster'),
  ];
  const result = computeBriefRadialLayout({ sections, ...centerParams });
  for (const section of result) {
    assert.ok(section.arcEndAngle > section.arcStartAngle, `Section ${section.sectionId}: end ${section.arcEndAngle} should be > start ${section.arcStartAngle}`);
  }
});
