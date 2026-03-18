import { CaptureBox } from './components/CaptureBox';
import { ExpandedNote } from './components/ExpandedNote';
import { RecallBand } from './components/RecallBand';
import { RelationshipWeb } from './components/RelationshipWeb';
import { SpatialCanvas } from './components/SpatialCanvas';
import { ThinkingSurface } from './components/ThinkingSurface';
import { createProjectLens, createWorkspaceLens } from './scene/lens';
import { useSceneController } from './scene/useSceneController';

export function App() {
  const {
    scene,
    activeNote,
    visibleNotes,
    lensState,
    archivedNotes,
    activeProjectId,
    lensWorkspaceId,
    hoveredNoteId,
    relationshipFilter,
    recentlyClosedNoteId,
    rankedRelationships,
    relationshipPanelItems,
    relationshipTotals,
    ambientRelatedNoteIds,
    ambientGlowLevel,
    pulseNoteId,
    recenterTarget,
    revealState,
    visibleRevealMatchIds,
    revealActiveNoteId,
    setRelationshipFilter,
    closeActiveNote,
    updateNote,
    bringToFront,
    setLens,
    createExplicitRelationship,
    confirmRelationship,
    traverseToRelated,
    toggleNoteFocus,
    toggleQuickCapture,
    onCanvasScroll,
    onViewportCenterChange,
    onOpenNote,
    onArchiveNote,
    onCapture,
    onHoverStart,
    onHoverEnd,
    onWhereWasI,
    onRevealQueryChange,
    onReveal,
    onRevealNext,
    onRevealPrev
  } = useSceneController();

  return (
    <ThinkingSurface>
      <RecallBand
        count={visibleNotes.length}
        archivedCount={archivedNotes.length}
        quickCaptureOpen={scene.quickCaptureOpen}
        activeLensLabel={lensState.activeLensLabel}
        activeLensDescription={lensState.activeLensDescription}
        activeWorkspaceId={lensWorkspaceId}
        activeProjectId={activeProjectId}
        availableWorkspaceIds={lensState.availableWorkspaceIds}
        availableProjectIds={lensState.availableProjectIds}
        revealQuery={revealState.query}
        revealMatchCount={visibleRevealMatchIds.length}
        onSetWorkspaceLens={(workspaceId) => setLens(createWorkspaceLens(workspaceId))}
        onSetProjectLens={(projectId) =>
          setLens(projectId ? createProjectLens(projectId, lensWorkspaceId) : createWorkspaceLens(lensWorkspaceId))
        }
        onToggleQuickCapture={toggleQuickCapture}
        onWhereWasI={onWhereWasI}
        onRevealQueryChange={onRevealQueryChange}
        onReveal={onReveal}
        onRevealPrev={onRevealPrev}
        onRevealNext={onRevealNext}
      />

      <section className="view-stack" data-lens={scene.lens.kind}>
        <div className="view-layer view-layer-canvas">
          <SpatialCanvas
            notes={visibleNotes}
            noteStates={lensState.noteStates}
            activeNoteId={activeNote?.id ?? null}
            hoveredNoteId={hoveredNoteId}
            revealMatchedNoteIds={visibleRevealMatchIds}
            revealActiveNoteId={revealActiveNoteId}
            initialScrollLeft={scene.canvasScrollLeft}
            initialScrollTop={scene.canvasScrollTop}
            recentlyClosedNoteId={recentlyClosedNoteId}
            relatedGlowNoteIds={ambientRelatedNoteIds}
            ambientGlowLevel={ambientGlowLevel}
            pulseNoteId={pulseNoteId}
            recenterTarget={recenterTarget}
            onScroll={onCanvasScroll}
            onViewportCenterChange={onViewportCenterChange}
            onDrag={(id, x, y) => updateNote(id, { x, y }, 'moved')}
            onOpen={onOpenNote}
            onBringToFront={bringToFront}
            onHoverStart={onHoverStart}
            onHoverEnd={onHoverEnd}
          />
          {visibleNotes.length === 0 && lensState.emptyMessage ? (
            <div className="lens-empty-state">{lensState.emptyMessage}</div>
          ) : null}
        </div>
      </section>

      {activeNote ? <div className="canvas-dim" /> : null}
      {activeNote ? (
        <RelationshipWeb
          activeNote={activeNote}
          notes={scene.notes}
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
