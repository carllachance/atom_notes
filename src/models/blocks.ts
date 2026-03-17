export type BlockType = 'text' | 'checklist' | 'code' | 'link';

export type BaseBlock = { id: string; type: BlockType };

export type TextBlock = BaseBlock & { type: 'text'; text: string };
export type ChecklistItem = { id: string; text: string; checked: boolean };
export type ChecklistBlock = BaseBlock & { type: 'checklist'; items: ChecklistItem[] };
export type CodeBlock = BaseBlock & { type: 'code'; code: string; language?: string };
export type LinkBlock = BaseBlock & { type: 'link'; url: string; title?: string };

export type Block = TextBlock | ChecklistBlock | CodeBlock | LinkBlock;
