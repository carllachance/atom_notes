import test from 'node:test';
import assert from 'node:assert/strict';
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
  inFocus: false,
  isFocus: false,
  projectIds: ['project-1'],
  inferredProjectIds: [],
  workspaceId: null,
  inferredRelationships: [],
  attachments: []
};

const projects: Project[] = [{ id: 'project-1', key: 'OPS', name: 'Operations Planning', color: '#7aa2f7', description: '', createdAt: 1, updatedAt: 1 }];
const workspaces: Workspace[] = [{ id: 'workspace-1', key: 'ENG', name: 'Engineering', color: '#5fbf97', description: '', createdAt: 1, updatedAt: 1 }];

function render() {
  return renderToStaticMarkup(
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
      onAddAttachments={() => {}}
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
  );
}

test('expanded note keeps organization disclosures collapsed by default in read mode', () => {
  const markup = render();
  assert.match(markup, /Anchored in<\/strong><small>Assign workspace<\/small>/);
  assert.match(markup, /Shared threads<\/strong><small>Operations Planning<\/small>/);
  assert.match(markup, /aria-expanded="false"/);
  assert.equal(markup.includes('No workspace assigned'), false);
});
