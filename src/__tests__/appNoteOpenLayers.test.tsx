import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { AppNoteOpenLayers } from '../App';
import { NoteCardModel, Project, Workspace } from '../types';

const note: NoteCardModel = {
  id: 'note-1',
  title: 'Plan',
  body: 'Body',
  anchors: [],
  trace: 'idle',
  x: 0,
  y: 0,
  z: 1,
  createdAt: 1,
  updatedAt: 1,
  archived: false,
  deleted: false,
  deletedAt: null,
  inFocus: true,
  isFocus: true,
  projectIds: ['project-1'],
  inferredProjectIds: [],
  workspaceId: null,
  inferredRelationships: [],
  attachments: []
};

const projects: Project[] = [{ id: 'project-1', key: 'OPS', name: 'Operations Planning', color: '#7aa2f7', description: '', createdAt: 1, updatedAt: 1 }];
const workspaces: Workspace[] = [{ id: 'workspace-1', key: 'ENG', name: 'Engineering', color: '#5fbf97', description: '', createdAt: 1, updatedAt: 1 }];

function renderNoteOpenLayers() {
  return renderToStaticMarkup(
    <AppNoteOpenLayers
      activeNote={note}
      activeNoteProjects={projects}
      activeWorkspace={null}
      addAttachmentsToActiveNote={async () => {}}
      canvasMetrics={null}
      canUndoRelationshipEdit={false}
      captureDockInset={88}
      closeActiveNote={() => {}}
      closeRelationshipInspector={() => {}}
      confirmRelationship={() => {}}
      createExplicitRelationship={() => {}}
      createInlineLinkedNote={() => null}
      createProjectForNote={() => null}
      createWorkspaceForNote={() => null}
      deleteActiveNote={() => {}}
      focusLensPresentation={{
        active: true,
        activeNoteId: note.id,
        rootNoteId: note.id,
        focusStack: [note.id],
        relatedNotes: [],
        overflowCount: 0,
        canGoBack: true,
        pinned: true,
        noteStateById: {},
        layoutById: {},
        noteIds: [note.id],
        debug: null
      } as any}
      goBackFocusLens={() => {}}
      hasFreshInsights={false}
      hoveredNoteId={null}
      inspectRelationship={() => {}}
      inspectedRelationship={null}
      lensPresentation={{
        lens: { kind: 'universe' },
        lensLabel: 'Universe',
        activeProject: null,
        activeWorkspace: null,
        visibleNotes: [note],
        archivedNotes: [],
        revealMatchIds: [],
        noteMetaById: {},
        projectConnectorSegments: []
      } as any}
      notePanelPositions={{ [note.id]: { x: 0, y: 0 } }}
      notes={[note]}
      visibleNotes={[note]}
      onArchiveNote={() => {}}
      onHoverEnd={() => {}}
      onHoverStart={() => {}}
      pinFocusLens={() => {}}
      projects={projects}
      promoteNoteFragmentToTask={() => ({ taskNoteId: null, promotionId: null })}
      relationshipFilter="all"
      relationshipPanelItems={[]}
      relationshipWebOverride={<div className="relationship-web-layer" />}
      removeAttachment={() => {}}
      removeRelationship={() => {}}
      resetFocusLens={() => {}}
      restoreArchivedNote={() => {}}
      retryAttachmentProcessing={() => {}}
      rightInset={24}
      setExpandedSurface={() => {}}
      setLens={() => {}}
      setNotePanelPositions={() => undefined}
      setNoteProjects={() => {}}
      setNoteWorkspace={() => {}}
      setTaskState={() => {}}
      thinkingActive={false}
      toggleNoteFocus={() => {}}
      traverseToRelated={() => {}}
      undoRelationshipEdit={() => {}}
      updateNote={() => {}}
      updateRelationship={() => {}}
      workspaces={workspaces}
    />
  );
}

test('app note-open layers keep the expanded note visible while the backdrop is present', () => {
  const markup = renderNoteOpenLayers();
  const backdropIndex = markup.indexOf('class="canvas-dim"');
  const relationshipWebIndex = markup.indexOf('class="relationship-web-layer"');
  const shellIndex = markup.indexOf('class="expanded-note-shell"');

  assert.notEqual(backdropIndex, -1, 'expected note backdrop to render');
  assert.notEqual(relationshipWebIndex, -1, 'expected relationship web layer to render');
  assert.notEqual(shellIndex, -1, 'expected expanded note shell to render');
  assert.ok(backdropIndex < relationshipWebIndex, 'expected backdrop markup before relationship web');
  assert.ok(relationshipWebIndex < shellIndex, 'expected relationship web markup before modal shell');
  assert.match(markup, /class="expanded-note expanded-note--rescue"/);
  assert.match(markup, /aria-label="Note title"/);
  assert.match(markup, /value="Plan"/);
});
