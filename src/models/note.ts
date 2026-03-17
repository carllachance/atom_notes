import { Block } from './blocks';

export type InteractionType = 'text' | 'checklist' | 'code' | 'link' | 'note';

export type Note = {
  id: string;
  title: string;
  blocks: Block[];
  createdAt: string;
  updatedAt: string;
  archived: boolean;
  pinned: boolean;
  lastInteractionText: string;
  lastInteractionType: InteractionType;
  lastInteractionTime: string;
};
