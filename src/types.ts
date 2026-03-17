export type WorkspaceView = 'canvas' | 'archive';

export type NoteCardModel = {
  id: string;
  title: string;
  body: string;
  anchors: string[];
  trace: string;
  stateCue: string;
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
  currentView: WorkspaceView;
  canvasScrollLeft: number;
  canvasScrollTop: number;
};
