export type RefinementScope = 'selection' | 'note';

export type RefinementPresetId =
  | 'clarify'
  | 'executive_summary'
  | 'summarize'
  | 'bulletize'
  | 'meeting_minutes'
  | 'study_guide'
  | 'legal_brief'
  | 'custom';

export type RefinementPreset = {
  id: RefinementPresetId;
  label: string;
  shortLabel: string;
  description: string;
  category: 'refine' | 'format';
};

export type RefinementRequest = {
  presetId: RefinementPresetId;
  scope: RefinementScope;
  sourceText: string;
  noteTitle?: string | null;
  customInstruction?: string;
};

export type RefinementSuggestion = {
  presetId: RefinementPresetId;
  label: string;
  scope: RefinementScope;
  summary: string;
  originalText: string;
  suggestedText: string;
};

export const REFINEMENT_PRESETS: RefinementPreset[] = [
  { id: 'clarify', label: 'Clarify', shortLabel: 'Clarify', description: 'Tighten rough language without changing scope.', category: 'refine' },
  { id: 'executive_summary', label: 'Executive Summary', shortLabel: 'Exec Summary', description: 'Reshape notes into a concise executive-ready readout.', category: 'format' },
  { id: 'summarize', label: 'Summarize', shortLabel: 'Summarize', description: 'Surface the main takeaway quickly.', category: 'refine' },
  { id: 'bulletize', label: 'Bulletize', shortLabel: 'Bulletize', description: 'Turn rough prose into scannable bullets.', category: 'refine' },
  { id: 'meeting_minutes', label: 'Meeting Minutes', shortLabel: 'Minutes', description: 'Reframe the note as agenda, decisions, and follow-ups.', category: 'format' },
  { id: 'study_guide', label: 'Study Guide', shortLabel: 'Study Guide', description: 'Turn notes into review prompts and key ideas.', category: 'format' },
  { id: 'legal_brief', label: 'Legal Brief', shortLabel: 'Legal Brief', description: 'Reframe content into issue, facts, analysis, and next steps.', category: 'format' },
  { id: 'custom', label: 'Custom', shortLabel: 'Custom', description: 'Apply a user-specified restructuring instruction.', category: 'format' }
];

function normalizeWhitespace(text: string) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function splitParagraphs(text: string) {
  return normalizeWhitespace(text)
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function splitIdeas(text: string) {
  const normalized = normalizeWhitespace(text);
  if (!normalized) return [];
  const rawLines = normalized
    .split('\n')
    .flatMap((line) => line.split(/(?<=[.!?])\s+/))
    .map((line) => line.replace(/^[-*•]\s*/, '').trim())
    .filter(Boolean);
  return rawLines.length ? rawLines : [normalized];
}

function toSentence(text: string) {
  const trimmed = text.trim().replace(/\s+/g, ' ');
  if (!trimmed) return '';
  const withCapital = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return /[.!?]$/.test(withCapital) ? withCapital : `${withCapital}.`;
}

function toBullets(items: string[], limit = items.length) {
  return items.slice(0, limit).map((item) => `- ${toSentence(item)}`).join('\n');
}

function buildClarifiedText(sourceText: string) {
  const paragraphs = splitParagraphs(sourceText);
  if (!paragraphs.length) return '';
  return paragraphs
    .map((paragraph) => {
      const ideas = splitIdeas(paragraph);
      return ideas.map(toSentence).join(' ');
    })
    .join('\n\n');
}

function buildSummary(sourceText: string) {
  const ideas = splitIdeas(sourceText);
  if (!ideas.length) return '';
  const opening = ideas.slice(0, 2).map((idea) => idea.replace(/\.$/, '')).join('; ');
  const support = ideas.slice(2, 4);
  return [
    `Summary: ${toSentence(opening)}`,
    support.length ? `Key points:\n${toBullets(support, 2)}` : ''
  ].filter(Boolean).join('\n\n');
}

function buildBulletizedText(sourceText: string) {
  const ideas = splitIdeas(sourceText);
  if (!ideas.length) return '';
  return toBullets(ideas);
}

function buildExecutiveSummary(sourceText: string, noteTitle?: string | null) {
  const ideas = splitIdeas(sourceText);
  const headline = ideas[0] ?? sourceText;
  const supporting = ideas.slice(1, 4);
  return [
    '# Executive Summary',
    '',
    `**Topic:** ${noteTitle?.trim() || 'Current note'}`,
    '',
    '## Overview',
    toSentence(headline),
    '',
    '## Key Signals',
    supporting.length ? toBullets(supporting, 3) : '- No additional signals surfaced yet.',
    '',
    '## Recommended Next Step',
    toSentence(supporting[0] ?? headline)
  ].join('\n');
}

function buildMeetingMinutes(sourceText: string) {
  const ideas = splitIdeas(sourceText);
  return [
    '# Meeting Minutes',
    '',
    '## Agenda',
    ideas.length ? toBullets([ideas[0]], 1) : '- No agenda captured.',
    '',
    '## Discussion',
    ideas.length > 1 ? toBullets(ideas.slice(1, 4), 3) : '- Discussion details were light in the source note.',
    '',
    '## Decisions',
    ideas.length > 2 ? toBullets(ideas.slice(2, 4), 2) : '- No explicit decisions were captured.',
    '',
    '## Follow-ups',
    ideas.length > 3 ? toBullets(ideas.slice(3, 5), 2) : '- No follow-up actions were explicitly captured.'
  ].join('\n');
}

function buildStudyGuide(sourceText: string) {
  const ideas = splitIdeas(sourceText);
  return [
    '# Study Guide',
    '',
    '## Key Ideas',
    ideas.length ? toBullets(ideas.slice(0, 4), 4) : '- No core ideas surfaced.',
    '',
    '## Terms to Remember',
    ideas.length > 1 ? toBullets(ideas.slice(1, 3).map((idea) => `Remember: ${idea}`), 2) : '- Add notable terms after review.',
    '',
    '## Review Questions',
    ideas.length
      ? ideas.slice(0, 3).map((idea, index) => `${index + 1}. What does this mean in context: ${idea.replace(/[.!?]+$/, '')}?`).join('\n')
      : '1. What is the main concept in this note?'
  ].join('\n');
}

function buildLegalBrief(sourceText: string) {
  const ideas = splitIdeas(sourceText);
  const issue = ideas[0] ?? sourceText;
  return [
    '# Legal Brief',
    '',
    '## Issue',
    toSentence(issue),
    '',
    '## Facts',
    ideas.length > 1 ? toBullets(ideas.slice(1, 4), 3) : '- Facts need to be confirmed from the source note.',
    '',
    '## Analysis',
    toSentence(ideas[1] ?? issue),
    '',
    '## Recommended Action',
    toSentence(ideas[2] ?? issue)
  ].join('\n');
}

function buildCustomRestructure(sourceText: string, instruction: string, noteTitle?: string | null) {
  const ideas = splitIdeas(sourceText);
  const trimmedInstruction = instruction.trim();
  return [
    `# AI-suggested format: ${trimmedInstruction}`,
    '',
    `**Source:** ${noteTitle?.trim() || 'Current note'}`,
    '',
    '## Framing',
    toSentence(trimmedInstruction),
    '',
    '## Restructured Draft',
    ideas.length ? toBullets(ideas, Math.min(5, ideas.length)) : '- No source material was available to restructure.'
  ].join('\n');
}

function getSummaryLine(presetId: RefinementPresetId, scope: RefinementScope, customInstruction?: string) {
  const scopeLabel = scope === 'selection' ? 'selected text' : 'current note';
  if (presetId === 'clarify') return `AI-suggested clarification for the ${scopeLabel}.`;
  if (presetId === 'executive_summary') return `AI-suggested executive summary for the ${scopeLabel}.`;
  if (presetId === 'summarize') return `AI-suggested summary for the ${scopeLabel}.`;
  if (presetId === 'bulletize') return `AI-suggested bullet version of the ${scopeLabel}.`;
  if (presetId === 'meeting_minutes') return `AI-suggested meeting-minutes format for the ${scopeLabel}.`;
  if (presetId === 'study_guide') return `AI-suggested study guide for the ${scopeLabel}.`;
  if (presetId === 'legal_brief') return `AI-suggested legal brief for the ${scopeLabel}.`;
  return `AI-suggested restructure for the ${scopeLabel}: ${customInstruction?.trim() || 'custom instruction'}.`;
}

export function generateRefinementSuggestion({
  presetId,
  scope,
  sourceText,
  noteTitle,
  customInstruction
}: RefinementRequest): RefinementSuggestion {
  const originalText = normalizeWhitespace(sourceText);
  const preset = REFINEMENT_PRESETS.find((candidate) => candidate.id === presetId);
  const label = preset?.label ?? 'Refine';

  let suggestedText = originalText;
  if (presetId === 'clarify') suggestedText = buildClarifiedText(originalText);
  else if (presetId === 'executive_summary') suggestedText = buildExecutiveSummary(originalText, noteTitle);
  else if (presetId === 'summarize') suggestedText = buildSummary(originalText);
  else if (presetId === 'bulletize') suggestedText = buildBulletizedText(originalText);
  else if (presetId === 'meeting_minutes') suggestedText = buildMeetingMinutes(originalText);
  else if (presetId === 'study_guide') suggestedText = buildStudyGuide(originalText);
  else if (presetId === 'legal_brief') suggestedText = buildLegalBrief(originalText);
  else suggestedText = buildCustomRestructure(originalText, customInstruction ?? 'Custom format', noteTitle);

  return {
    presetId,
    label,
    scope,
    summary: getSummaryLine(presetId, scope, customInstruction),
    originalText,
    suggestedText: suggestedText.trim(),
  };
}

export function buildInsertedRefinementBlock(label: string, suggestedText: string) {
  return [`AI-suggested ${label}`, '', suggestedText.trim()].join('\n');
}
