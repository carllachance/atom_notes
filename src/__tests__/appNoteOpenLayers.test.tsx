import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { ExpandedNote } from '../components/ExpandedNote';
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

function renderOpenNoteMarkup() {
  return renderToStaticMarkup(
    <>
      <button type="button" className="canvas-dim" aria-label="Close note" />
      <div className="relationship-web-layer" />
      <ExpandedNote
        note={note}
        notes={[note]}
        projects={projects}
        workspaces={workspaces}
        noteProjects={projects}
        noteWorkspace={null}
        relationships={[]}
        inspectedRelationship={null}
        canUndoRelationshipEdit={false}
        activeProjectRevealId={null}
        activeWorkspaceLensId={null}
        thinkingActive={false}
        hasFreshInsights={false}
        onClose={() => {}}
        onThinkAboutNote={() => {}}
        onArchive={() => {}}
        onRestoreArchive={() => {}}
        onDelete={() => {}}
        onChange={() => {}}
        onOpenRelated={() => {}}
        onInspectRelationship={() => {}}
        onCloseRelationshipInspector={() => {}}
        onCreateExplicitLink={() => {}}
        onCreateInlineLinkedNote={() => null}
        onConfirmRelationship={() => {}}
        onPromoteFragmentToTask={() => ({ taskNoteId: null, promotionId: null })}
        onSetTaskState={() => {}}
        onUpdateRelationship={() => {}}
        onRemoveRelationship={() => {}}
        onUndoRelationshipEdit={() => {}}
        onToggleFocus={() => {}}
        onSetProjectIds={() => {}}
        onCreateProject={() => {}}
        onSetWorkspaceId={() => {}}
        onCreateWorkspace={() => {}}
        onSetProjectLens={() => {}}
        onSetWorkspaceLens={() => {}}
        onAddAttachments={async () => {}}
        onRemoveAttachment={() => {}}
        onRetryAttachment={() => {}}
        onHoverRelatedNote={() => {}}
        onClearRelatedHover={() => {}}
        focusLensRelatedNotes={[]}
        focusLensOverflowCount={0}
        hoveredRelatedNoteId={null}
        focusLensCanGoBack={false}
        focusLensPinned={false}
        onFocusLensBack={() => {}}
        onFocusLensPin={() => {}}
        onFocusLensReset={() => {}}
      />
    </>
  );
}

test('App keeps backdrop, relationship web, and expanded note ordered for an open note', () => {
  const appSource = readFileSync('src/App.tsx', 'utf8');
  const backdropIndex = appSource.indexOf('className="canvas-dim"');
  const relationshipWebIndex = appSource.indexOf('<RelationshipWeb');
  const expandedNoteIndex = appSource.indexOf('<ExpandedNote');
  const markup = renderOpenNoteMarkup();

  assert.notEqual(backdropIndex, -1, 'expected App to render the note backdrop');
  assert.notEqual(relationshipWebIndex, -1, 'expected App to render the relationship web');
  assert.notEqual(expandedNoteIndex, -1, 'expected App to render the expanded note');
  assert.ok(backdropIndex < relationshipWebIndex, 'expected backdrop source before relationship web');
  assert.ok(relationshipWebIndex < expandedNoteIndex, 'expected relationship web source before expanded note');
  assert.match(markup, /class="canvas-dim"/);
  assert.match(markup, /class="relationship-web-layer"/);
  assert.match(markup, /class="expanded-note-shell"/);
  assert.match(markup, /class="expanded-note expanded-note--rescue"/);
  assert.match(markup, /aria-label="Note title"/);
  assert.match(markup, /value="Plan"/);
});
