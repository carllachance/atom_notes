import { parseMarkdownProjection } from '../markdownProjection';

export type SemanticSignalType = 'decision' | 'open_question' | 'follow_up';

export type SemanticSignal = {
  type: SemanticSignalType;
  text: string;
  start: number;
  end: number;
};

function readTokenText(tokens: Array<{ value: string }>) {
  return tokens.map((token) => token.value).join('').trim();
}

function readSignalRange(tokens: Array<{ start: number; end: number }>) {
  if (!tokens.length) return null;
  const start = Math.min(...tokens.map((token) => token.start));
  const end = Math.max(...tokens.map((token) => token.end));
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
  return { start, end };
}

export function collectSemanticSignals(source: string): SemanticSignal[] {
  if (!source.trim()) return [];

  const blocks = parseMarkdownProjection(source);
  const signals: SemanticSignal[] = [];

  blocks.forEach((block) => {
    if (block.type !== 'decision' && block.type !== 'open_question' && block.type !== 'follow_up') return;
    const text = readTokenText(block.tokens);
    if (!text) return;

    const range = readSignalRange(block.tokens);
    if (!range) return;

    signals.push({
      type: block.type,
      text,
      start: range.start,
      end: range.end
    });
  });

  return signals;
}
