import { ArchiveView } from './components/ArchiveView';
import { CaptureBox } from './components/CaptureBox';
import { ExpandedNote } from './components/ExpandedNote';
import { RecallBand } from './components/RecallBand';
import { RelationshipWeb } from './components/RelationshipWeb';
import { SpatialCanvas } from './components/SpatialCanvas';
import { ThinkingSurface } from './components/ThinkingSurface';
import { useSceneController } from './scene/useSceneController';

export function App() {
  const {
    scene,
    activeNote,
    activeNotes,
    archivedNotes,
    relationshipFilter,
    recentlyClosedNoteId,
    rankedRelationships,
    relationshipPanelItems,
    relationshipTotals,
    setRelationshipFilter,
    showFocusedOnly,
    closeActiveNote,
    updateNote,
    bringToFront,
    setView,
    createExplicitRelationship,
    confirmRelationship,
    traverseToRelated,
    toggleNoteFocus,
    toggleFocusedOnly,
    toggleQuickCapture,
    onCanvasScroll,
    onOpenNote,
    onRestoreNote,
    onArchiveNote,
    onCapture
  } = useSceneController();

  return (
    <ThinkingSurface>
      <RecallBand
        count={activeNotes.length}
        archivedCount={archivedNotes.length}
        quickCaptureOpen={scene.quickCaptureOpen}
        currentView={scene.currentView}
        onSetView={setView}
        onToggleQuickCapture={toggleQuickCapture}
        showFocusedOnly={showFocusedOnly}
        onToggleFocusedOnly={toggleFocusedOnly}
      />

      <section className="view-stack" data-view={scene.currentView}>
        <div className="view-layer view-layer-canvas">
          <SpatialCanvas
            notes={activeNotes}
            initialScrollLeft={scene.canvasScrollLeft}
            initialScrollTop={scene.canvasScrollTop}
            recentlyClosedNoteId={recentlyClosedNoteId}
            onScroll={onCanvasScroll}
            onDrag={(id, x, y) => updateNote(id, { x, y }, 'moved')}
            onOpen={onOpenNote}
            onBringToFront={bringToFront}
          />
        </div>

        <div className="view-layer view-layer-archive">
          <ArchiveView notes={archivedNotes} onRestore={onRestoreNote} />
        </div>
      </section>

      {activeNote ? <div className="canvas-dim" /> : null}
      {activeNote && scene.currentView === 'canvas' ? (
        <RelationshipWeb
          activeNote={activeNote}
          notes={activeNotes}
          rankedRelationships={rankedRelationships}
          filter={relationshipFilter}
          onTraverse={traverseToRelated}
        />
      ) : null}

      <CaptureBox isOpen={scene.quickCaptureOpen} onCapture={onCapture} />

      <ExpandedNote
        note={activeNote}
        notes={scene.notes}
        relationships={relationshipPanelItems}
        relationshipTotals={relationshipTotals}
        activeFilter={relationshipFilter}
        onSetFilter={setRelationshipFilter}
        onClose={closeActiveNote}
        onChange={(id, updates) => {
          const trace = 'title' in updates || 'body' in updates ? 'refined' : 'idle';
          updateNote(id, updates, trace);
        }}
        onArchive={onArchiveNote}
        onOpenRelated={traverseToRelated}
        onCreateExplicitLink={createExplicitRelationship}
        onConfirmRelationship={confirmRelationship}
        onToggleFocus={toggleNoteFocus}
      />
    </ThinkingSurface>
  );
}
