import { useState } from 'react';
import { AIPanel } from './components/AIPanel';
import { CaptureComposer } from './components/CaptureComposer';
import { ExpandedNote } from './components/ExpandedNote';
import { RecallBand } from './components/RecallBand';
import { RelationshipWeb } from './components/RelationshipWeb';
import { CanvasViewportMetrics } from './components/relationshipWebGeometry';
import { SpatialCanvas } from './components/SpatialCanvas';
import { ThinkingSurface } from './components/ThinkingSurface';
import { useSceneController } from './scene/useSceneController';

export function App() {
  const [canvasMetrics, setCanvasMetrics] = useState<CanvasViewportMetrics | null>(null);
  const demoLinks = [{ href: '/query-prototype', label: 'Query demo' }];

  const {
    scene,
    activeNote,
    activeNoteProjects,
    activeWorkspace,
    visibleNotes,
    archivedNotes,
    projects,
    workspaces,
    lensPresentation,
    focusCount,
    pendingAction,
    hoveredNoteId,
    relationshipFilter,
    isDragging,
    inspectedRelationship,
    canUndoRelationshipEdit,
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
    setPendingAction,
    setRelationshipFilter,
    inspectRelationship,
    closeRelationshipInspector,
    closeActiveNote,
    updateNote,
    bringToFront,
    setIsDragging,
    setLens,
    setFocusMode,
    setAIPanel,
    setAIPanelVisibility,
    createExplicitRelationship,
    confirmRelationship,
    updateRelationship,
    undoRelationshipEdit,
    traverseToRelated,
    toggleNoteFocus,
    setNoteProjects,
    createProjectForNote,
    setNoteWorkspace,
    createWorkspaceForNote,
    onCanvasScroll,
    onViewportCenterChange,
    onOpenNote,
    onArchiveNote,
    onHoverStart,
    onHoverEnd,
    onWhereWasI,
    onRevealQueryChange,
    onReveal,
    onRevealNext,
    onRevealPrev,
    onCaptureDraftChange,
    commitCapture,
    cancelCapture,
    undoLastCapture,
    openAIReference,
    runInsights,
    confirmPendingAction,
    cancelPendingAction
  } = useSceneController();

  return (
    <ThinkingSurface>
      <RecallBand
        count={visibleNotes.length}
        archivedCount={archivedNotes.length}
        lens={scene.lens}
        lensLabel={lensPresentation.lensLabel}
        projects={projects}
        workspaces={workspaces}
        focusMode={scene.focusMode}
        focusCount={focusCount}
        revealQuery={revealState.query}
        revealMatchCount={visibleRevealMatchIds.length}
        onSetLens={setLens}
        onSetFocusMode={setFocusMode}
        onOpenComposer={() => onCaptureDraftChange(scene.captureComposer.draft)}
        onWhereWasI={onWhereWasI}
        onRevealQueryChange={onRevealQueryChange}
        onReveal={onReveal}
        onRevealPrev={onRevealPrev}
        onRevealNext={onRevealNext}
        demoLinks={demoLinks}
      />

      <section className="workspace-shell">
        <section className="view-stack" data-lens={scene.lens.kind}>
          <div className="view-layer view-layer-canvas">
            <SpatialCanvas
              notes={visibleNotes}
              noteMetaById={lensPresentation.noteMetaById}
              focusHighlightEnabled={scene.focusMode.highlight}
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
              isDragging={isDragging}
              recenterTarget={recenterTarget}
              activeProject={lensPresentation.activeProject}
              projectConnectorSegments={lensPresentation.projectConnectorSegments}
              onScroll={onCanvasScroll}
              onViewportCenterChange={onViewportCenterChange}
              onMetricsChange={setCanvasMetrics}
              onDragStart={() => setIsDragging(true)}
              onDragEnd={(id, x, y, moved) => {
                if (moved) updateNote(id, { x, y }, 'moved');
                setIsDragging(false);
              }}
              onOpen={onOpenNote}
              onBringToFront={bringToFront}
              onHoverStart={onHoverStart}
              onHoverEnd={onHoverEnd}
            />
            {scene.lens.kind === 'workspace' && visibleNotes.length === 0 ? <div className="lens-empty-state">No notes are anchored in this workspace yet. Keep the scope, then capture or assign notes into it.</div> : null}
            {scene.lens.kind === 'project' && visibleNotes.length === 0 ? <div className="lens-empty-state">No notes are attached to this project yet. Add a project inside a note to give it a calm shared cluster.</div> : null}
          </div>
        </section>

        <AIPanel
          panel={scene.aiPanel}
          selectedNote={activeNote}
          visibleNotesCount={visibleNotes.length}
          activeProject={lensPresentation.activeProject}
          notes={scene.notes}
          onStateChange={setAIPanelVisibility}
          onModeChange={(mode) => setAIPanel({ mode })}
          onQueryChange={(query) => setAIPanel({ query })}
          onRun={runInsights}
          onOpenReference={openAIReference}
          pendingAction={pendingAction}
          noteIsOpen={Boolean(activeNote)}
          onPreviewAction={setPendingAction}
          onConfirmAction={confirmPendingAction}
          onCancelAction={cancelPendingAction}
        />
      </section>

      {activeNote ? <div className="canvas-dim" /> : null}
      {activeNote ? <RelationshipWeb activeNote={activeNote} notes={visibleNotes} rankedRelationships={rankedRelationships} filter={relationshipFilter} canvasMetrics={canvasMetrics} onInspectRelationship={inspectRelationship} /> : null}

      <CaptureComposer
        isOpen={scene.captureComposer.open}
        value={scene.captureComposer.draft}
        onChange={onCaptureDraftChange}
        onCommit={commitCapture}
        onCancel={cancelCapture}
        onUndo={undoLastCapture}
        canUndo={Boolean(scene.captureComposer.lastCreatedNoteId)}
      />

      <ExpandedNote
        note={activeNote}
        notes={scene.notes}
        projects={projects}
        workspaces={workspaces}
        noteProjects={activeNoteProjects}
        noteWorkspace={activeWorkspace}
        relationships={relationshipPanelItems}
        inspectedRelationship={inspectedRelationship}
        canUndoRelationshipEdit={canUndoRelationshipEdit}
        relationshipTotals={relationshipTotals}
        activeFilter={relationshipFilter}
        activeProjectRevealId={lensPresentation.activeProject?.id ?? null}
        activeWorkspaceLensId={lensPresentation.activeWorkspace?.id ?? null}
        onSetFilter={setRelationshipFilter}
        onClose={closeActiveNote}
        onChange={(id, updates) => {
          const trace = 'title' in updates || 'body' in updates ? 'refined' : 'idle';
          updateNote(id, updates, trace);
        }}
        onArchive={onArchiveNote}
        onOpenRelated={traverseToRelated}
        onInspectRelationship={inspectRelationship}
        onCloseRelationshipInspector={closeRelationshipInspector}
        onCreateExplicitLink={createExplicitRelationship}
        onConfirmRelationship={confirmRelationship}
        onUpdateRelationship={updateRelationship}
        onUndoRelationshipEdit={undoRelationshipEdit}
        onToggleFocus={toggleNoteFocus}
        onSetProjectIds={setNoteProjects}
        onCreateProject={createProjectForNote}
        onSetWorkspaceId={setNoteWorkspace}
        onCreateWorkspace={createWorkspaceForNote}
        onSetProjectLens={(projectId) => setLens(projectId ? { kind: 'project', projectId, mode: 'context' } : { kind: 'universe' })}
        onSetWorkspaceLens={(workspaceId) => setLens(workspaceId ? { kind: 'workspace', workspaceId, mode: 'context' } : { kind: 'universe' })}
        onHoverRelatedNote={onHoverStart}
        onClearRelatedHover={onHoverEnd}
      />
    </ThinkingSurface>
  );
}
