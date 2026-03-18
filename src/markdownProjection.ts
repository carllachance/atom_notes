export type InlineToken =
  | { type: 'text'; value: string }
  | { type: 'code'; value: string }
  | { type: 'link'; value: string; href: string };

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

function parseInlineTokens(input: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let cursor = 0;

  while (cursor < input.length) {
    const rest = input.slice(cursor);
    const codeMatch = rest.match(/^`([^`]+)`/);
    if (codeMatch) {
      tokens.push({ type: 'code', value: codeMatch[1] });
      cursor += codeMatch[0].length;
      continue;
    }

    const linkMatch = rest.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/);
    if (linkMatch) {
      tokens.push({ type: 'link', value: linkMatch[1], href: linkMatch[2] });
      cursor += linkMatch[0].length;
      continue;
    }

    const nextCode = rest.indexOf('`');
    const nextLink = rest.indexOf('[');
    const candidates = [nextCode, nextLink].filter((index) => index >= 0);
    const nextSpecial = candidates.length ? Math.min(...candidates) : -1;

    if (nextSpecial === 0) {
      tokens.push({ type: 'text', value: rest[0] });
      cursor += 1;
      continue;
    }

    const chunkEnd = nextSpecial === -1 ? input.length : cursor + nextSpecial;
    tokens.push({ type: 'text', value: input.slice(cursor, chunkEnd) });
    cursor = chunkEnd;
  }

  return tokens;
}

function startsSpecialBlock(line: string): boolean {
  return /^(#{1,6}\s+|>\s?|[-*+]\s+|\d+\.\s+|```)/.test(line) || PLAIN_TASK_LINE_PATTERN.test(line);
}

function parseListItem(content: string, lineIndex: number): MarkdownListItem {
  const checkbox = content.match(TASK_PATTERN);
  if (!checkbox) {
    return { checked: null as boolean | null, tokens: parseInlineTokens(content.trim()), lineIndex };
  }

  return {
    checked: checkbox[1].toLowerCase() === 'x',
    tokens: parseInlineTokens((checkbox[2] ?? '').trim()),
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
      blocks.push({ type: 'heading', level: heading[1].length, tokens: parseInlineTokens(heading[2].trim()) });
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quoteLines: InlineToken[][] = [];
      let cursor = i;
      while (cursor < lines.length && /^>\s?/.test(lines[cursor])) {
        quoteLines.push(parseInlineTokens(lines[cursor].replace(/^>\s?/, '').trim()));
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
        items.push(parseListItem(lines[cursor].replace(/^[-*+]\s+/, ''), cursor));
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
        items.push(parseListItem(lines[cursor].replace(/^\d+\.\s+/, ''), cursor));
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
        items.push(parseListItem(lines[cursor].trimStart(), cursor));
        cursor += 1;
      }
      blocks.push({ type: 'unordered_list', items });
      i = cursor - 1;
      continue;
    }

    const paragraphLines: string[] = [line.trim()];
    let cursor = i + 1;
    while (cursor < lines.length && lines[cursor].trim() && !startsSpecialBlock(lines[cursor])) {
      paragraphLines.push(lines[cursor].trim());
      cursor += 1;
    }
    blocks.push({ type: 'paragraph', tokens: parseInlineTokens(paragraphLines.join(' ')) });
    i = cursor - 1;
  }

  return blocks;
}
