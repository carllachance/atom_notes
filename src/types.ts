export type NoteCardModel = {
  id: string;
  title: string;
  body: string;
  x: number;
  y: number;
  archived: boolean;
  createdAt: number;
  updatedAt: number;
};

export type SceneState = {
  surfaceVisible: boolean;
  captureOpen: boolean;
  activeView: 'canvas' | 'archive';
  selectedCardId: string | null;
  cards: NoteCardModel[];
};
