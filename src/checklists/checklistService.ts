import { SemanticEditableBlock, serializeSemanticBlocks } from '../notes/semanticBlocks';
import { toggleMarkdownCheckbox } from '../markdownProjection';

type ChecklistAnchor = {
  lineIndex?: number;
  blockId?: string;
};

export function toggleChecklistItem(source: string, anchor: ChecklistAnchor, checked: boolean): string {
  if (typeof anchor.lineIndex === 'number') {
    return toggleMarkdownCheckbox(source, anchor.lineIndex, checked);
  }

  return source;
}

export function toggleChecklistItemInBlocks(
  blocks: SemanticEditableBlock[],
  anchor: ChecklistAnchor,
  checked: boolean
): { blocks: SemanticEditableBlock[]; source: string } {
  const nextBlocks = blocks.map((block) => {
    if (block.type !== 'checklist_item') return block;
    if (!anchor.blockId || block.id !== anchor.blockId) return block;
    return { ...block, checked };
  });

  return { blocks: nextBlocks, source: serializeSemanticBlocks(nextBlocks) };
}
