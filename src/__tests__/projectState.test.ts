import { describe, expect, it, vi } from '../test/vitest';
import { createProjectAndAssignToNoteInScene, createProjectInScene, setProjectRevealInScene, toggleNoteProjectMembershipInScene } from '../projects/projectActions';
import { getNotesByProjectId, getProjectRevealPresentation, getProjectSummaries, getProjectsForNote } from '../projects/projectSelectors';
import { SceneState } from '../types';

function makeScene(): SceneState {
  return {
    notes: [
      { id: 'n1', title: null, body: 'Alpha', anchors: [], trace: 'idle', x: 0, y: 0, z: 1, createdAt: 1, updatedAt: 1, archived: false, projectIds: [] },
      { id: 'n2', title: null, body: 'Beta', anchors: [], trace: 'idle', x: 50, y: 50, z: 2, createdAt: 1, updatedAt: 1, archived: false, projectIds: [] },
      { id: 'n3', title: null, body: 'Gamma', anchors: [], trace: 'idle', x: 90, y: 90, z: 3, createdAt: 1, updatedAt: 1, archived: false, projectIds: [] }
    ],
    relationships: [],
    projects: [],
    projectReveal: { activeProjectId: null },
    activeNoteId: null,
    quickCaptureOpen: false,
    lastCtrlTapTs: 0,
    lens: 'all',
    canvasScrollLeft: 0,
    canvasScrollTop: 0
  };
}

describe('project feature state', () => {
  it('creates a project and persists stable metadata', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1000);
    vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue('project-1');

    const created = createProjectInScene(makeScene(), { name: 'SLD', color: '#7fd4c9', description: 'Shipping lane docs' });
    expect(created.project).toMatchObject({ id: 'project-1', slug: 'sld', name: 'SLD', color: '#7fd4c9', description: 'Shipping lane docs' });
    expect(created.scene.projects).toHaveLength(1);
  });

  it('supports zero, one, and many project memberships per note', () => {
    vi.spyOn(Date, 'now').mockReturnValue(2000);
    const { scene: withSld, project: sld } = createProjectInScene(makeScene(), { name: 'SLD', color: '#89a8ff' });
    const { scene: withAtlas, project: atlas } = createProjectInScene(withSld, { name: 'Atlas', color: '#f0b06f' });

    const noteWithoutProjects = withAtlas.notes[0];
    expect(noteWithoutProjects.projectIds).toEqual([]);

    const assignedOnce = toggleNoteProjectMembershipInScene(withAtlas, 'n1', sld!.id);
    expect(assignedOnce.notes[0].projectIds).toEqual([sld!.id]);

    const assignedTwice = toggleNoteProjectMembershipInScene(assignedOnce, 'n1', atlas!.id);
    expect([...assignedTwice.notes[0].projectIds].sort((a, b) => a.localeCompare(b))).toEqual([atlas!.id, sld!.id].sort((a, b) => a.localeCompare(b)));
    expect(getProjectsForNote(assignedTwice.notes[0], assignedTwice.projects).map((project) => project.name).sort()).toEqual(['Atlas', 'SLD']);

    const removed = toggleNoteProjectMembershipInScene(assignedTwice, 'n1', atlas!.id);
    expect(removed.notes[0].projectIds).toEqual([sld!.id]);
  });

  it('switches project reveal state and cleans stale highlight state when changing projects', () => {
    vi.spyOn(Date, 'now').mockReturnValue(3000);
    const { scene: withSld, project: sld } = createProjectInScene(makeScene(), { name: 'SLD', color: '#89a8ff' });
    const { scene: withAtlas, project: atlas } = createProjectInScene(withSld, { name: 'Atlas', color: '#f0b06f' });
    const sldScene = toggleNoteProjectMembershipInScene(toggleNoteProjectMembershipInScene(withAtlas, 'n1', sld!.id), 'n2', sld!.id);
    const multiScene = toggleNoteProjectMembershipInScene(sldScene, 'n3', atlas!.id);

    const revealSld = setProjectRevealInScene(multiScene, sld!.id);
    const sldPresentation = getProjectRevealPresentation(revealSld, revealSld.notes);
    expect(sldPresentation.memberNoteIds).toEqual(['n1', 'n2']);
    expect(sldPresentation.backgroundNoteIds).toEqual(['n3']);
    expect(getNotesByProjectId(revealSld.notes, sld!.id).map((note) => note.id)).toEqual(['n1', 'n2']);

    const revealAtlas = setProjectRevealInScene(revealSld, atlas!.id);
    const atlasPresentation = getProjectRevealPresentation(revealAtlas, revealAtlas.notes);
    expect(atlasPresentation.memberNoteIds).toEqual(['n3']);
    expect(atlasPresentation.backgroundNoteIds).toEqual(['n1', 'n2']);

    const cleared = setProjectRevealInScene(revealAtlas, 'missing-project');
    const clearedPresentation = getProjectRevealPresentation(cleared, cleared.notes);
    expect(cleared.projectReveal.activeProjectId).toBeNull();
    expect(clearedPresentation.memberNoteIds).toEqual([]);
    expect(clearedPresentation.backgroundNoteIds).toEqual(['n1', 'n2', 'n3']);
    expect(getProjectSummaries(revealAtlas).map((project) => [project.name, project.noteCount])).toEqual([
      ['SLD', 2],
      ['Atlas', 1]
    ]);
  });

  it('creates a new project while assigning it to a note', () => {
    vi.spyOn(Date, 'now').mockReturnValue(4000);
    vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue('project-sld');

    const next = createProjectAndAssignToNoteInScene(makeScene(), 'n2', { name: 'SLD', color: '#7fd4c9' });
    expect(next.projects[0]).toMatchObject({ id: 'project-sld', name: 'SLD' });
    expect(next.notes[1].projectIds).toEqual(['project-sld']);
  });
});
