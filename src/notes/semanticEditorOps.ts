import { createParagraphBlock, SemanticEditableBlock } from './semanticBlocks';

export type CursorPosition = { index: number; caret: number };

function withNewId(block: SemanticEditableBlock, suffix: string): SemanticEditableBlock {
  return { ...block, id: `${block.id}-${suffix}-${Date.now()}` } as SemanticEditableBlock;
}

export function splitBlockOnEnter(blocks: SemanticEditableBlock[], index: number, caret: number): { blocks: SemanticEditableBlock[]; focus: CursorPosition } {
  const block = blocks[index];
  if (!block) return { blocks, focus: { index: Math.max(0, blocks.length - 1), caret: 0 } };

  if (block.type === 'checklist_item' && block.text.length === 0) {
    const next = [...blocks];
    next[index] = { id: block.id, type: 'paragraph', text: '' };
    return { blocks: next, focus: { index, caret: 0 } };
  }

  const before = block.text.slice(0, caret);
  const after = block.text.slice(caret);
  const current = { ...block, text: before } as SemanticEditableBlock;
  const inserted: SemanticEditableBlock = block.type === 'heading'
    ? createParagraphBlock(after)
    : withNewId({ ...block, text: after } as SemanticEditableBlock, 'n');

  return {
    blocks: [...blocks.slice(0, index), current, inserted, ...blocks.slice(index + 1)],
    focus: { index: index + 1, caret: 0 }
  };
}

export function mergeWithPreviousBlock(blocks: SemanticEditableBlock[], index: number): { blocks: SemanticEditableBlock[]; focus: CursorPosition } {
  const block = blocks[index];
  if (!block) return { blocks, focus: { index: 0, caret: 0 } };

  if (block.type !== 'paragraph' && block.text.length === 0) {
    const next = [...blocks];
    next[index] = { id: block.id, type: 'paragraph', text: '' };
    return { blocks: next, focus: { index, caret: 0 } };
  }

  if (index === 0) {
    return { blocks, focus: { index: 0, caret: 0 } };
  }

  const previous = blocks[index - 1];
  if (!previous) {
    return { blocks, focus: { index: 0, caret: 0 } };
  }

  const mergedPrevious = { ...previous, text: `${previous.text}${block.text}` } as SemanticEditableBlock;
  const next = [...blocks];
  next.splice(index - 1, 2, mergedPrevious);
  return { blocks: next, focus: { index: index - 1, caret: previous.text.length } };
}

export function pasteIntoBlocks(
  blocks: SemanticEditableBlock[],
  index: number,
  selectionStart: number,
  selectionEnd: number,
  pastedText: string
): { blocks: SemanticEditableBlock[]; focus: CursorPosition } {
  const block = blocks[index];
  if (!block) return { blocks, focus: { index: 0, caret: 0 } };

  const normalized = pastedText.replace(/\r\n/g, '\n');
  if (!normalized.includes('\n')) {
    const next = [...blocks];
    next[index] = {
      ...block,
      text: `${block.text.slice(0, selectionStart)}${normalized}${block.text.slice(selectionEnd)}`
    };
    return { blocks: next, focus: { index, caret: selectionStart + normalized.length } };
  }

  const lines = normalized.split('\n');
  const head = block.text.slice(0, selectionStart);
  const tail = block.text.slice(selectionEnd);
  const firstLine = `${head}${lines[0] ?? ''}`;
  const trailingLine = `${lines[lines.length - 1] ?? ''}${tail}`;

  const inserted = lines.map((line, lineIndex) => {
    if (lineIndex === 0) return { ...block, text: firstLine } as SemanticEditableBlock;
    if (lineIndex === lines.length - 1) return withNewId({ ...block, text: trailingLine } as SemanticEditableBlock, 'paste');
    return withNewId({ ...block, text: line } as SemanticEditableBlock, 'paste');
  });

  const next = [...blocks.slice(0, index), ...inserted, ...blocks.slice(index + 1)];
  return {
    blocks: next,
    focus: { index: index + lines.length - 1, caret: lines[lines.length - 1]?.length ?? 0 }
  };
}
