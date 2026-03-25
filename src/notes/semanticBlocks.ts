export type SemanticEditableBlock =
  | { id: string; type: 'paragraph'; text: string }
  | { id: string; type: 'heading'; level: 1 | 2 | 3; text: string }
  | { id: string; type: 'checklist_item'; checked: boolean; text: string };

let blockCounter = 0;

function nextId() {
  blockCounter += 1;
  return `sem-${blockCounter}`;
}

function parseHeading(line: string) {
  const match = line.match(/^(#{1,3})\s+(.*)$/);
  if (!match) return null;
  return { level: match[1].length as 1 | 2 | 3, text: match[2] };
}

function parseChecklist(line: string) {
  const match = line.match(/^\s*[-*+]\s+\[( |x|X)\]\s*(.*)$/);
  if (!match) return null;
  return { checked: match[1].toLowerCase() === 'x', text: match[2] };
}

export function parseSemanticBlocks(source: string): SemanticEditableBlock[] {
  const normalized = source.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');
  const blocks = lines.map<SemanticEditableBlock>((line) => {
    const heading = parseHeading(line);
    if (heading) {
      return { id: nextId(), type: 'heading', level: heading.level, text: heading.text };
    }

    const checklist = parseChecklist(line);
    if (checklist) {
      return { id: nextId(), type: 'checklist_item', checked: checklist.checked, text: checklist.text };
    }

    return { id: nextId(), type: 'paragraph', text: line };
  });

  return blocks.length ? blocks : [{ id: nextId(), type: 'paragraph', text: '' }];
}

export function getBlockPrefix(block: SemanticEditableBlock): string {
  if (block.type === 'heading') return `${'#'.repeat(block.level)} `;
  if (block.type === 'checklist_item') return `- [${block.checked ? 'x' : ' '}] `;
  return '';
}

export function serializeSemanticBlocks(blocks: SemanticEditableBlock[]): string {
  return blocks.map((block) => `${getBlockPrefix(block)}${block.text}`).join('\n');
}
