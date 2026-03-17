export type NoteCardModel = {
  id: string;
  title: string;
  body: string;
  anchors: string[];
  x: number;
  y: number;
  z: number;
  createdAt: number;
  updatedAt: number;
  archived: boolean;
};

export type SceneState = {
  notes: NoteCardModel[];
  activeNoteId: string | null;
  quickCaptureOpen: boolean;
  lastCtrlTapTs: number;
};
