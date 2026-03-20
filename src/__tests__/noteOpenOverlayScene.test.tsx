import assert from 'node:assert/strict';
import test from 'node:test';
import type { ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NoteOpenOverlayScene } from '../components/NoteOpenOverlayScene';
import { ExpandedNote } from '../components/ExpandedNote';
import { RelationshipWeb } from '../components/RelationshipWeb';
import { SpatialCanvas } from '../components/SpatialCanvas';
import { clearTraversalHistory } from '../store/sessionSlice';
import { NoteCardModel, Project, Relationship, Workspace } from '../types';

const notes: NoteCardModel[] = [
  {
    id: 'note-1',
    title: 'Overlay focus note',
    body: 'Plan the modal overlay with a calm relationship web.',
    anchors: [],
    trace: 'idle',
    x: 120,
    y: 160,
    z: 2,
    createdAt: 1,
    updatedAt: 1,
    archived: false,
    deleted: false,
    deletedAt: null,
    inFocus: false,
    isFocus: false,
    projectIds: ['project-1'],
    inferredProjectIds: [],
    workspaceId: 'workspace-1',
    inferredRelationships: [],
    attachments: []
  },
  {
    id: 'note-2',
    title: 'Reference note',
    body: 'Reference material for the modal graph.',
    anchors: [],
    trace: 'idle',
    x: 420,
    y: 220,
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
    workspaceId: 'workspace-1',
    inferredRelationships: [],
    attachments: []
  }
];

const relationship: Relationship = {
  id: 'rel-1',
  fromId: 'note-1',
  toId: 'note-2',
  type: 'references',
  state: 'confirmed',
  explicitness: 'explicit',
  directional: true,
  confidence: 0.92,
  isInferred: false,
  explanation: 'Same source document.',
  heuristicSupported: true,
  createdAt: 1,
  lastActiveAt: 1
};

const projects: Project[] = [
  { id: 'project-1', key: 'OPS', name: 'Operations Planning', color: '#7aa2f7', description: '', createdAt: 1, updatedAt: 1 }
];

const workspaces: Workspace[] = [
  { id: 'workspace-1', key: 'ENG', name: 'Engineering', color: '#5fbf97', description: '', createdAt: 1, updatedAt: 1 }
];

let capturedCanvasProps: ComponentProps<typeof SpatialCanvas> | null = null;

function TestSpatialCanvas(props: ComponentProps<typeof SpatialCanvas>) {
  capturedCanvasProps = props;
  return (
    <div className="test-spatial-canvas" data-active-note-id={props.activeNoteId ?? ''}>
      <button type="button" onClick={() => props.onOpen(notes[0].id)}>
        Open note
      </button>
    </div>
  );
}

function TestRelationshipWeb() {
  return <div className="relationship-web-layer" data-testid="relationship-web-layer" />;
}

function TestExpandedNote(props: ComponentProps<typeof ExpandedNote>) {
  return props.note ? <div className="expanded-note-shell"><div className="note-title-field">{props.note.title}</div></div> : null;
}

const spatialCanvasProps: Omit<ComponentProps<typeof SpatialCanvas>, 'notes' | 'activeNoteId' | 'onOpen'> = {
  noteMetaById: {},
  focusLensStateById: {},
  focusLensLayoutById: {},
  focusMode: { highlight: false, isolate: false },
  hoveredNoteId: null,
  revealMatchedNoteIds: [],
  revealActiveNoteId: null,
  initialScrollLeft: 0,
  initialScrollTop: 0,
  recentlyClosedNoteId: null,
  relatedGlowNoteIds: [],
  pulseNoteId: null,
  ambientGlowLevel: 0,
  isDragging: false,
  recenterTarget: null,
  activeProject: null,
  projectConnectorSegments: [],
  relationships: [relationship],
  onScroll: () => {},
  onViewportCenterChange: () => {},
  onMetricsChange: () => {},
  onDragStart: () => {},
  onDragEnd: () => {},
  onBringToFront: () => {},
  onHoverStart: () => {},
  onHoverEnd: () => {},
  reservedRightInset: 0
};

const expandedNoteProps: Omit<ComponentProps<typeof ExpandedNote>, 'note' | 'notes' | 'noteProjects' | 'noteWorkspace'> = {
  projects,
  workspaces,
  relationships: [
    {
      id: relationship.id,
      targetId: 'note-2',
      targetTitle: 'Reference note',
      type: relationship.type,
      explicitness: relationship.explicitness,
      state: relationship.state,
      explanation: relationship.explanation,
      heuristicSupported: relationship.heuristicSupported,
      fromId: relationship.fromId,
      toId: relationship.toId,
      directional: relationship.directional,
      confidence: relationship.confidence
    }
  ],
  inspectedRelationship: null,
  canUndoRelationshipEdit: false,
  activeProjectRevealId: null,
  activeWorkspaceLensId: null,
  thinkingActive: false,
  hasFreshInsights: false,
  onClose: () => {},
  onThinkAboutNote: () => {},
  onArchive: () => {},
  onRestoreArchive: () => {},
  onDelete: () => {},
  onChange: () => {},
  onOpenRelated: () => {},
  onInspectRelationship: () => {},
  onCloseRelationshipInspector: () => {},
  onCreateExplicitLink: () => {},
  onCreateInlineLinkedNote: () => null,
  onConfirmRelationship: () => {},
  onPromoteFragmentToTask: () => ({ taskNoteId: null, promotionId: null }),
  onSetTaskState: () => {},
  onUpdateRelationship: () => {},
  onRemoveRelationship: () => {},
  onUndoRelationshipEdit: () => {},
  onToggleFocus: () => {},
  onSetProjectIds: () => {},
  onCreateProject: () => {},
  onSetWorkspaceId: () => {},
  onCreateWorkspace: () => {},
  onSetProjectLens: () => {},
  onSetWorkspaceLens: () => {},
  onAddAttachments: () => {},
  onRemoveAttachment: () => {},
  onRetryAttachment: () => {},
  onHoverRelatedNote: () => {},
  onClearRelatedHover: () => {},
  focusLensRelatedNotes: [],
  focusLensOverflowCount: 0,
  hoveredRelatedNoteId: null,
  focusLensCanGoBack: false,
  focusLensPinned: false,
  onFocusLensBack: () => {},
  onFocusLensPin: () => {},
  onFocusLensReset: () => {},
  onPositionChange: () => {}
};

function renderScene(activeNoteId: string | null, onOpenNote: (noteId: string) => void) {
  capturedCanvasProps = null;
  return renderToStaticMarkup(
    <NoteOpenOverlayScene
      notes={notes}
      visibleNotes={notes}
      activeNoteId={activeNoteId}
      activeNoteProjects={projects}
      activeWorkspace={workspaces[0]}
      relatedNotes={[
        {
          relationshipId: relationship.id,
          targetId: 'note-2',
          targetTitle: 'Reference note',
          score: 0.92,
          degree: 1,
          relationship
        }
      ]}
      relationshipFilter="all"
      canvasMetrics={null}
      hoveredNoteId={null}
      onOpenNote={onOpenNote}
      onCloseNote={() => {}}
      onInspectRelationship={() => {}}
      onOpenRelated={() => {}}
      onHoverRelatedNote={() => {}}
      onClearRelatedHover={() => {}}
      spatialCanvasProps={spatialCanvasProps}
      expandedNoteProps={expandedNoteProps}
      components={{
        SpatialCanvasComponent: TestSpatialCanvas,
        RelationshipWebComponent: TestRelationshipWeb as typeof RelationshipWeb,
        ExpandedNoteComponent: TestExpandedNote as typeof ExpandedNote
      }}
    />
  );
}

test('note-open overlay scene keeps canvas, dimmer, relationship web, and expanded note together after open', () => {
  clearTraversalHistory();
  let openedNoteId: string | null = null;

  const closedMarkup = renderScene(null, (noteId) => {
    openedNoteId = noteId;
  });

  assert.match(closedMarkup, /test-spatial-canvas/);
  if (!capturedCanvasProps) {
    throw new Error('expected the spatial canvas test double to capture props');
  }
  const canvasProps = capturedCanvasProps;
  canvasProps.onOpen(notes[0].id);

  assert.equal(openedNoteId, 'note-1');

  const openMarkup = renderScene(openedNoteId, () => {});

  assert.match(openMarkup, /class="canvas-dim"/);
  assert.match(openMarkup, /class="relationship-web-layer"/);
  assert.match(openMarkup, /class="expanded-note-shell"/);
  assert.match(openMarkup, /class="note-title-field"/);
  assert.match(openMarkup, /Overlay focus note/);
  const dimIndex = openMarkup.indexOf('class="canvas-dim"');
  const relationshipWebIndex = openMarkup.indexOf('class="relationship-web-layer"');
  const expandedNoteIndex = openMarkup.indexOf('class="expanded-note-shell"');

  assert.ok(dimIndex >= 0, 'expected the dimmer layer to render');
  assert.ok(relationshipWebIndex > dimIndex, 'expected the relationship web to render above the dimmer');
  assert.ok(expandedNoteIndex > relationshipWebIndex, 'expected the expanded note shell to render above the relationship web');
  assert.ok(
    /canvas-dim/.test(openMarkup) && /expanded-note-shell/.test(openMarkup) && /note-title-field/.test(openMarkup),
    'expected the open-note composition to retain note UI beyond the backdrop layer'
  );
});
