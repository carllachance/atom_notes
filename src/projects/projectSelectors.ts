import { NoteCardModel, Project, SceneState } from '../types';

export type ProjectConnectorSegment = {
  from: { x: number; y: number };
  to: { x: number; y: number };
};

export type ProjectRevealPresentation = {
  activeProject: Project | null;
  highlightedNoteIds: string[];
  subordinateNoteIds: string[];
  visibleNotes: NoteCardModel[];
  connectorSegments: ProjectConnectorSegment[];
};

const NOTE_WIDTH = 270;
const NOTE_HEIGHT = 124;

function noteCenter(note: NoteCardModel) {
  return {
    x: note.x + NOTE_WIDTH / 2,
    y: note.y + NOTE_HEIGHT / 2
  };
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function getProjectById(scene: SceneState, projectId: string | null): Project | null {
  if (!projectId) return null;
  return scene.projects.find((project) => project.id === projectId) ?? null;
}

export function getNotesForProject(notes: NoteCardModel[], projectId: string): NoteCardModel[] {
  return notes.filter((note) => note.projectIds.includes(projectId));
}

export function getProjectsForNote(scene: SceneState, noteId: string): Project[] {
  const note = scene.notes.find((candidate) => candidate.id === noteId);
  if (!note) return [];
  const projectIds = new Set(note.projectIds);
  return scene.projects.filter((project) => projectIds.has(project.id));
}

export function buildSparseProjectConnectorSegments(notes: NoteCardModel[]): ProjectConnectorSegment[] {
  if (notes.length < 2) return [];

  const remaining = notes.map((note) => ({ note, center: noteCenter(note) }));
  const centroid = remaining.reduce(
    (acc, entry) => ({ x: acc.x + entry.center.x, y: acc.y + entry.center.y }),
    { x: 0, y: 0 }
  );
  centroid.x /= remaining.length;
  centroid.y /= remaining.length;

  remaining.sort((a, b) => distance(a.center, centroid) - distance(b.center, centroid));
  const connected = [remaining.shift()!];
  const segments: ProjectConnectorSegment[] = [];

  while (remaining.length > 0) {
    let bestCandidateIndex = 0;
    let bestConnectedIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (let candidateIndex = 0; candidateIndex < remaining.length; candidateIndex += 1) {
      for (let connectedIndex = 0; connectedIndex < connected.length; connectedIndex += 1) {
        const nextDistance = distance(remaining[candidateIndex].center, connected[connectedIndex].center);
        if (nextDistance < bestDistance) {
          bestDistance = nextDistance;
          bestCandidateIndex = candidateIndex;
          bestConnectedIndex = connectedIndex;
        }
      }
    }

    const candidate = remaining.splice(bestCandidateIndex, 1)[0];
    const anchor = connected[bestConnectedIndex];
    segments.push({ from: anchor.center, to: candidate.center });
    connected.push(candidate);
  }

  return segments;
}

export function getProjectRevealPresentation(scene: SceneState, notes: NoteCardModel[]): ProjectRevealPresentation {
  const activeProject = getProjectById(scene, scene.projectReveal.activeProjectId);
  if (!activeProject) {
    return {
      activeProject: null,
      highlightedNoteIds: [],
      subordinateNoteIds: [],
      visibleNotes: notes,
      connectorSegments: []
    };
  }

  const highlightedNotes = getNotesForProject(notes, activeProject.id);
  const highlightedNoteIds = highlightedNotes.map((note) => note.id);
  const highlightedIdSet = new Set(highlightedNoteIds);
  const subordinateNoteIds = notes.filter((note) => !highlightedIdSet.has(note.id)).map((note) => note.id);

  return {
    activeProject,
    highlightedNoteIds,
    subordinateNoteIds,
    visibleNotes: scene.projectReveal.isolate ? highlightedNotes : notes,
    connectorSegments: buildSparseProjectConnectorSegments(highlightedNotes)
  };
}
