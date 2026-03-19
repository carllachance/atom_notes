export type InlineToken =
  | { type: 'text'; value: string; start: number; end: number }
  | { type: 'code'; value: string; start: number; end: number }
  | { type: 'link'; value: string; href: string; start: number; end: number };

export type MarkdownListItem = {
  tokens: InlineToken[];
  checked: boolean | null;
  lineIndex: number;
};

export type MarkdownBlock =
  | { type: 'heading'; level: number; tokens: InlineToken[] }
  | { type: 'paragraph'; tokens: InlineToken[] }
  | { type: 'blockquote'; lines: InlineToken[][] }
  | { type: 'unordered_list'; items: MarkdownListItem[] }
  | { type: 'ordered_list'; items: MarkdownListItem[] }
  | { type: 'code_block'; language: string; code: string };

const TASK_PATTERN = /^\[( |x|X)\](?:\s+(.*))?$/;
const PLAIN_TASK_LINE_PATTERN = /^\s*\[( |x|X)\](?:\s+.*)?$/;
const TASK_TOGGLE_PATTERNS = [
  /^(\s*\[)( |x|X)(\].*)$/,
  /^(\s*[-*+]\s+\[)( |x|X)(\].*)$/,
  /^(\s*\d+\.\s+\[)( |x|X)(\].*)$/
];

function parseInlineTokens(input: string, baseOffset: number): InlineToken[] {
  const tokens: InlineToken[] = [];
  let cursor = 0;

  while (cursor < input.length) {
    const rest = input.slice(cursor);
    const codeMatch = rest.match(/^`([^`]+)`/);
    if (codeMatch) {
      tokens.push({ type: 'code', value: codeMatch[1], start: baseOffset + cursor, end: baseOffset + cursor + codeMatch[0].length });
      cursor += codeMatch[0].length;
      continue;
    }

    const linkMatch = rest.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/);
    if (linkMatch) {
      tokens.push({ type: 'link', value: linkMatch[1], href: linkMatch[2], start: baseOffset + cursor, end: baseOffset + cursor + linkMatch[0].length });
      cursor += linkMatch[0].length;
      continue;
    }

    const nextCode = rest.indexOf('`');
    const nextLink = rest.indexOf('[');
    const candidates = [nextCode, nextLink].filter((index) => index >= 0);
    const nextSpecial = candidates.length ? Math.min(...candidates) : -1;

    if (nextSpecial === 0) {
      tokens.push({ type: 'text', value: rest[0], start: baseOffset + cursor, end: baseOffset + cursor + 1 });
      cursor += 1;
      continue;
    }

    const chunkEnd = nextSpecial === -1 ? input.length : cursor + nextSpecial;
    tokens.push({ type: 'text', value: input.slice(cursor, chunkEnd), start: baseOffset + cursor, end: baseOffset + chunkEnd });
    cursor = chunkEnd;
  }

  return tokens;
}

function startsSpecialBlock(line: string): boolean {
  return /^(#{1,6}\s+|>\s?|[-*+]\s+|\d+\.\s+|```)/.test(line) || PLAIN_TASK_LINE_PATTERN.test(line);
}

function parseListItem(content: string, lineIndex: number, baseOffset: number): MarkdownListItem {
  const checkbox = content.match(TASK_PATTERN);
  if (!checkbox) {
    const trimmed = content.trim();
    return { checked: null as boolean | null, tokens: parseInlineTokens(trimmed, baseOffset + content.indexOf(trimmed)), lineIndex };
  }

  const label = (checkbox[2] ?? '').trim();
  const labelStart = checkbox[2] ? content.indexOf(checkbox[2]) : content.length;
  return {
    checked: checkbox[1].toLowerCase() === 'x',
    tokens: parseInlineTokens(label, baseOffset + Math.max(0, labelStart)),
    lineIndex
  };
}

export function toggleMarkdownCheckbox(source: string, lineIndex: number, checked: boolean): string {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const line = lines[lineIndex];
  if (line == null) return source;

  for (const pattern of TASK_TOGGLE_PATTERNS) {
    if (!pattern.test(line)) continue;
    lines[lineIndex] = line.replace(pattern, `$1${checked ? 'x' : ' '}$3`);
    return lines.join('\n');
  }

  return source;
}

export function parseMarkdownProjection(source: string): MarkdownBlock[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const lineOffsets: number[] = [];
  let runningOffset = 0;
  for (const line of lines) {
    lineOffsets.push(runningOffset);
    runningOffset += line.length + 1;
  }
  const blocks: MarkdownBlock[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    if (!line.trim()) continue;

    const codeFence = line.match(/^```(.*)$/);
    if (codeFence) {
      const codeLines: string[] = [];
      const language = codeFence[1].trim();
      i += 1;
      while (i < lines.length && !/^```/.test(lines[i])) {
        codeLines.push(lines[i]);
        i += 1;
      }
      blocks.push({ type: 'code_block', language, code: codeLines.join('\n') });
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const contentStart = lineOffsets[i] + line.indexOf(heading[2]);
      blocks.push({ type: 'heading', level: heading[1].length, tokens: parseInlineTokens(heading[2].trim(), contentStart) });
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quoteLines: InlineToken[][] = [];
      let cursor = i;
      while (cursor < lines.length && /^>\s?/.test(lines[cursor])) {
        const content = lines[cursor].replace(/^>\s?/, '').trim();
        quoteLines.push(parseInlineTokens(content, lineOffsets[cursor] + lines[cursor].indexOf(content)));
        cursor += 1;
      }
      blocks.push({ type: 'blockquote', lines: quoteLines });
      i = cursor - 1;
      continue;
    }

    if (/^[-*+]\s+/.test(line)) {
      const items: MarkdownListItem[] = [];
      let cursor = i;
      while (cursor < lines.length && /^[-*+]\s+/.test(lines[cursor])) {
        const prefixLength = lines[cursor].match(/^[-*+]\s+/)?.[0].length ?? 0;
        items.push(parseListItem(lines[cursor].replace(/^[-*+]\s+/, ''), cursor, lineOffsets[cursor] + prefixLength));
        cursor += 1;
      }
      blocks.push({ type: 'unordered_list', items });
      i = cursor - 1;
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: MarkdownListItem[] = [];
      let cursor = i;
      while (cursor < lines.length && /^\d+\.\s+/.test(lines[cursor])) {
        const prefixLength = lines[cursor].match(/^\d+\.\s+/)?.[0].length ?? 0;
        items.push(parseListItem(lines[cursor].replace(/^\d+\.\s+/, ''), cursor, lineOffsets[cursor] + prefixLength));
        cursor += 1;
      }
      blocks.push({ type: 'ordered_list', items });
      i = cursor - 1;
      continue;
    }

    if (PLAIN_TASK_LINE_PATTERN.test(line)) {
      const items: MarkdownListItem[] = [];
      let cursor = i;
      while (cursor < lines.length && PLAIN_TASK_LINE_PATTERN.test(lines[cursor])) {
        const content = lines[cursor].trimStart();
        items.push(parseListItem(content, cursor, lineOffsets[cursor] + lines[cursor].indexOf(content)));
        cursor += 1;
      }
      blocks.push({ type: 'unordered_list', items });
      i = cursor - 1;
      continue;
    }

    const paragraphTokens: InlineToken[] = [];
    const firstTrimmed = line.trim();
    paragraphTokens.push(...parseInlineTokens(firstTrimmed, lineOffsets[i] + line.indexOf(firstTrimmed)));
    let cursor = i + 1;
    while (cursor < lines.length && lines[cursor].trim() && !startsSpecialBlock(lines[cursor])) {
      paragraphTokens.push({ type: 'text', value: ' ', start: lineOffsets[cursor] - 1, end: lineOffsets[cursor] - 1 });
      const trimmedLine = lines[cursor].trim();
      paragraphTokens.push(...parseInlineTokens(trimmedLine, lineOffsets[cursor] + lines[cursor].indexOf(trimmedLine)));
      cursor += 1;
    }
    blocks.push({ type: 'paragraph', tokens: paragraphTokens });
    i = cursor - 1;
  }

  return blocks;
}
