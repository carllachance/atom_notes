import { useState } from 'react';
import { CaptureBox } from './components/CaptureBox';
import { ExpandedNote } from './components/ExpandedNote';
import { RecallBand } from './components/RecallBand';
import { RelationshipWeb } from './components/RelationshipWeb';
import { CanvasViewportMetrics } from './components/relationshipWebGeometry';
import { SpatialCanvas } from './components/SpatialCanvas';
import { ThinkingSurface } from './components/ThinkingSurface';
import { useSceneController } from './scene/useSceneController';

export function App() {
  const [canvasMetrics, setCanvasMetrics] = useState<CanvasViewportMetrics | null>(null);
  const {
    scene,
    activeNote,
    activeNoteProjects,
    visibleNotes,
    archivedNotes,
    projects,
    projectReveal,
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
    setNoteProjects,
    createProjectForNote,
    setProjectReveal,
    setProjectRevealIsolation,
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
        lens={scene.lens}
        projects={projects}
        activeProjectId={projectReveal.activeProject?.id ?? null}
        projectIsolate={scene.projectReveal.isolate}
        revealQuery={revealState.query}
        revealMatchCount={visibleRevealMatchIds.length}
        onSetLens={setLens}
        onSetProjectReveal={setProjectReveal}
        onSetProjectIsolation={setProjectRevealIsolation}
        onToggleQuickCapture={toggleQuickCapture}
        onWhereWasI={onWhereWasI}
        onRevealQueryChange={onRevealQueryChange}
        onReveal={onReveal}
        onRevealPrev={onRevealPrev}
        onRevealNext={onRevealNext}
      />

      <section className="view-stack" data-lens={scene.lens}>
        <div className="view-layer view-layer-canvas">
          <SpatialCanvas
            notes={visibleNotes}
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
            projectReveal={projectReveal}
            onScroll={onCanvasScroll}
            onViewportCenterChange={onViewportCenterChange}
            onMetricsChange={setCanvasMetrics}
            onDrag={(id, x, y) => updateNote(id, { x, y }, 'moved')}
            onOpen={onOpenNote}
            onBringToFront={bringToFront}
            onHoverStart={onHoverStart}
            onHoverEnd={onHoverEnd}
          />
          {scene.lens === 'focus' && visibleNotes.length === 0 ? (
            <div className="lens-empty-state">No focused notes yet. Mark a note as focused to surface it here.</div>
          ) : null}
        </div>
      </section>

      {activeNote ? <div className="canvas-dim" /> : null}
      {activeNote ? (
        <RelationshipWeb
          activeNote={activeNote}
          notes={visibleNotes}
          rankedRelationships={rankedRelationships}
          filter={relationshipFilter}
          canvasMetrics={canvasMetrics}
          onTraverse={traverseToRelated}
        />
      ) : null}

      <CaptureBox isOpen={scene.quickCaptureOpen} onCapture={onCapture} />

      <ExpandedNote
        note={activeNote}
        notes={scene.notes}
        projects={projects}
        noteProjects={activeNoteProjects}
        relationships={relationshipPanelItems}
        relationshipTotals={relationshipTotals}
        activeFilter={relationshipFilter}
        activeProjectRevealId={projectReveal.activeProject?.id ?? null}
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
        onSetProjectIds={setNoteProjects}
        onCreateProject={createProjectForNote}
        onRevealProject={setProjectReveal}
      />
    </ThinkingSurface>
  );
}
