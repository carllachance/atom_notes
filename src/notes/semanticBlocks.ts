export type SemanticBlockOrigin = {
  origin?: 'user' | 'ai' | 'imported' | 'source';
  originRef?: string;
};

export type SemanticEditableBlock =
  | { id: string; type: 'paragraph'; text: string }
  | { id: string; type: 'heading'; level: 1 | 2 | 3; text: string }
  | { id: string; type: 'checklist_item'; checked: boolean; text: string }
  | ({ id: string; type: 'decision'; text: string } & SemanticBlockOrigin)
  | ({ id: string; type: 'open_question'; text: string } & SemanticBlockOrigin)
  | ({ id: string; type: 'follow_up'; text: string } & SemanticBlockOrigin)
  | { id: string; type: 'unsupported'; text: string; originalType?: string; raw?: string };

export type BlockConversionType = 'paragraph' | 'heading' | 'checklist_item' | 'decision' | 'open_question' | 'follow_up';
function parseOrigin(value: unknown): SemanticBlockOrigin['origin'] {
  if (value === 'user' || value === 'ai' || value === 'imported' || value === 'source') return value;
  return undefined;
}

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

function parseSemanticLine(line: string) {
  const decision = line.match(/^\s*Decision:\s*(.*)$/i);
  if (decision) return { type: 'decision' as const, text: decision[1] };

  const question = line.match(/^\s*(?:Open\s+question|Question):\s*(.*)$/i);
  if (question) return { type: 'open_question' as const, text: question[1] };

  const followUp = line.match(/^\s*Follow-up(?:\s*\([^)]*\))?:\s*(.*)$/i);
  if (followUp) return { type: 'follow_up' as const, text: followUp[1] };

  return null;
}

export function createParagraphBlock(text = ''): SemanticEditableBlock {
  return { id: nextId(), type: 'paragraph', text };
}

export function normalizeSemanticBlock(value: unknown, fallbackId = nextId()): SemanticEditableBlock {
  if (!value || typeof value !== 'object') return createParagraphBlock('');
  const candidate = value as Record<string, unknown>;
  const id = typeof candidate.id === 'string' && candidate.id ? candidate.id : fallbackId;
  const text = typeof candidate.text === 'string' ? candidate.text : '';

  if (candidate.type === 'heading') {
    const level = Number(candidate.level);
    const safeLevel = level >= 1 && level <= 3 ? (level as 1 | 2 | 3) : 1;
    return { id, type: 'heading', level: safeLevel, text };
  }

  if (candidate.type === 'checklist_item') {
    return { id, type: 'checklist_item', checked: Boolean(candidate.checked), text };
  }

  if (candidate.type === 'paragraph') {
    return { id, type: 'paragraph', text };
  }

  if (candidate.type === 'decision' || candidate.type === 'open_question' || candidate.type === 'follow_up') {
    const origin = parseOrigin(candidate.origin);
    const originRef = typeof candidate.originRef === 'string' ? candidate.originRef : undefined;
    return { id, type: candidate.type, text, origin, originRef };
  }

  const originalType = typeof candidate.type === 'string' ? candidate.type : undefined;
  const raw = typeof candidate.raw === 'string'
    ? candidate.raw
    : typeof candidate.text === 'string'
      ? candidate.text
      : '';
  return { id, type: 'unsupported', text: raw, originalType, raw };
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

    const semantic = parseSemanticLine(line);
    if (semantic) {
      return { id: nextId(), type: semantic.type, text: semantic.text };
    }

    return { id: nextId(), type: 'paragraph', text: line };
  });

  return blocks.length ? blocks : [createParagraphBlock('')];
}

export function getBlockPrefix(block: SemanticEditableBlock): string {
  if (block.type === 'heading') return `${'#'.repeat(block.level)} `;
  if (block.type === 'checklist_item') return `- [${block.checked ? 'x' : ' '}] `;
  if (block.type === 'decision') return 'Decision: ';
  if (block.type === 'open_question') return 'Question: ';
  if (block.type === 'follow_up') return 'Follow-up: ';
  return '';
}

export function convertBlockType(block: SemanticEditableBlock, nextType: BlockConversionType): SemanticEditableBlock {
  if (nextType === 'paragraph') {
    return { id: block.id, type: 'paragraph', text: block.text };
  }

  if (nextType === 'heading') {
    const previousLevel = block.type === 'heading' ? block.level : 1;
    return { id: block.id, type: 'heading', level: previousLevel, text: block.text };
  }

  if (nextType === 'decision' || nextType === 'open_question' || nextType === 'follow_up') {
    const origin = 'origin' in block ? block.origin : undefined;
    const originRef = 'originRef' in block ? block.originRef : undefined;
    return {
      id: block.id,
      type: nextType,
      text: block.text,
      ...(origin ? { origin } : {}),
      ...(originRef ? { originRef } : {})
    };
  }

  return {
    id: block.id,
    type: 'checklist_item',
    checked: block.type === 'checklist_item' ? block.checked : false,
    text: block.text
  };
}

export function serializeSemanticBlocks(blocks: SemanticEditableBlock[]): string {
  return blocks
    .map((block) => (block.type === 'unsupported' && typeof block.raw === 'string')
      ? block.raw
      : `${getBlockPrefix(block)}${block.text}`)
    .join('\n');
}
