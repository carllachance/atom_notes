import { useEffect, useRef, useState } from 'react';
import { AIPanel } from './components/AIPanel';
import { CaptureComposer } from './components/CaptureComposer';
import { ExpandedNote } from './components/ExpandedNote';
import { HomeSurface } from './components/HomeSurface';
import { RecallBand } from './components/RecallBand';
import { RelationshipWeb } from './components/RelationshipWeb';
import { CanvasViewportMetrics } from './components/relationshipWebGeometry';
import { SpatialCanvas } from './components/SpatialCanvas';
import { ThinkingSurface } from './components/ThinkingSurface';
import { summarizeCanvasVisibility } from './scene/canvasVisibility';
import { useSceneController } from './scene/useSceneController';


export function App() {
  const [canvasMetrics, setCanvasMetrics] = useState<CanvasViewportMetrics | null>(null);
  const [notePanelPositions, setNotePanelPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [thinkingRailWidth, setThinkingRailWidth] = useState(360);
  const hasAutoRecoveredRef = useRef(false);
  const demoLinks = [{ href: '/query-prototype', label: 'Query demo' }];

  const {
    scene,
    activeNote,
    activeNoteProjects,
    activeWorkspace,
    visibleNotes,
    totalActiveNotes,
    archivedNotes,
    deletedNotes,
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
    recallCue,
    rankedRelationships,
    relationshipPanelItems,
    focusLensPresentation,
    activeInsightTimeline,
    streamingResponse,
    isStreamingResponse,
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
    goBackFocusLens,
    pinFocusLens,
    resetFocusLens,
    updateNote,
    bringToFront,
    setIsDragging,
    setLens,
    setFocusMode,
    setAIPanel,
    setExpandedSurface,
    createExplicitRelationship,
    createInlineLinkedNote,
    confirmRelationship,
    promoteNoteFragmentToTask,
    setTaskState,
    updateRelationship,
    removeRelationship,
    undoRelationshipEdit,
    traverseToRelated,
    toggleNoteFocus,
    setNoteProjects,
    createProjectForNote,
    setNoteWorkspace,
    createWorkspaceForNote,
    addAttachmentsToActiveNote,
    removeAttachment,
    retryAttachmentProcessing,
    onCanvasScroll,
    onViewportCenterChange,
    onOpenNote,
    onArchiveNote,
    restoreArchivedNote,
    onHoverStart,
    onHoverEnd,
    onAdvanceRecallCue,
    onClearRecallCue,
    onRevealQueryChange,
    onReveal,
    onRevealNext,
    onRevealPrev,
    resetView,
    fitAllNotes,
    clearCanvasFocus,
    clearCanvasFilters,
    onCaptureDraftChange,
    commitCapture,
    cancelCapture,
    undoLastCapture,
    deleteActiveNote,
    restoreDeletedNote,
    undoDelete,
    recentlyDeletedNoteId,
    openAIReference,
    runInsights,
    confirmPendingAction,
    cancelPendingAction
  } = useSceneController();
  const canvasVisibility = summarizeCanvasVisibility(scene, lensPresentation, visibleNotes, canvasMetrics);
  const thinkingRailVisible = scene.expandedSecondarySurface === 'thinking';
  const captureExpanded = scene.expandedSecondarySurface === 'capture';
  const thinkingRailReservedInset = thinkingRailVisible ? thinkingRailWidth + 24 : 24;
  const captureDockInset = captureExpanded ? 236 : 88;
  const hasFreshInsights = Boolean(
    activeNote && (
      isStreamingResponse ||
      activeInsightTimeline.some((entry) => Date.now() - entry.createdAt < 1000 * 60 * 60)
    )
  );

  useEffect(() => {
    if (hasAutoRecoveredRef.current) return;
    if (!canvasVisibility.isBlankBecauseNotesAreOffCanvas) return;
    hasAutoRecoveredRef.current = true;
    fitAllNotes();
  }, [canvasVisibility.isBlankBecauseNotesAreOffCanvas, fitAllNotes]);

  return (
    <ThinkingSurface>
      <RecallBand
        count={visibleNotes.length}
        totalCount={totalActiveNotes}
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
        onRevealQueryChange={onRevealQueryChange}
        onReveal={onReveal}
        onRevealPrev={onRevealPrev}
        onRevealNext={onRevealNext}
        onResetView={resetView}
        onFitAllNotes={fitAllNotes}
        onClearFocus={clearCanvasFocus}
        onClearFilters={clearCanvasFilters}
        canClearFocus={scene.focusMode.isolate || scene.focusMode.highlight}
        canClearFilters={scene.lens.kind !== 'universe'}
        recallCue={recallCue ? { noteTitle: recallCue.noteTitle, suggestedNextStep: recallCue.suggestedNextStep } : null}
        onAdvanceRecallCue={onAdvanceRecallCue}
        onClearRecallCue={onClearRecallCue}
        demoLinks={demoLinks}
      />

      <section className="workspace-shell">
        <section className="view-stack" data-lens={scene.lens.kind}>
          {!activeNote ? (
            <HomeSurface
              notes={scene.notes}
              deletedNotes={deletedNotes}
              lastCreatedNoteId={scene.captureComposer.lastCreatedNoteId}
              onOpenNote={onOpenNote}
              onRestoreDeletedNote={restoreDeletedNote}
            />
          ) : null}
          <div className="view-layer view-layer-canvas">
            <SpatialCanvas
              notes={visibleNotes}
              noteMetaById={lensPresentation.noteMetaById}
              focusLensStateById={focusLensPresentation.noteStateById}
              focusLensLayoutById={focusLensPresentation.layoutById}
              focusMode={scene.focusMode}
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
              relationships={scene.relationships}
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
              reservedRightInset={0}
            />
            {canvasVisibility.shouldShowRecoveryHelper ? (
              <div className="canvas-recovery-helper" role="status" aria-live="polite">
                <div>
                  <strong>
                    {canvasVisibility.isBlankBecauseOfFocus
                      ? 'Focus only is hiding the wider universe.'
                      : canvasVisibility.isBlankBecauseOfFilters
                        ? 'This lens is currently showing no notes.'
                        : 'Your notes are present, but the viewport missed them.'}
                  </strong>
                  <p>
                    {canvasVisibility.isBlankBecauseOfFocus
                      ? `${canvasVisibility.hiddenByFocusCount} notes remain in scope. Turn off Focus only to restore the shared field.`
                      : canvasVisibility.isBlankBecauseOfFilters
                        ? `${canvasVisibility.totalActiveNotes} notes still exist in the universe. Clear the active scope or reset the view.`
                        : `${canvasVisibility.visibleNotes} notes are mounted, but none are inside the current viewport. Recenter without moving saved note positions.`}
                  </p>
                </div>
                <div className="canvas-recovery-helper__actions">
                  <button type="button" className="ghost-button" onClick={resetView}>Reset view</button>
                  <button type="button" className="ghost-button" onClick={fitAllNotes}>Fit all notes</button>
                  <button type="button" className="ghost-button" onClick={clearCanvasFocus} disabled={!scene.focusMode.isolate && !scene.focusMode.highlight}>Clear focus</button>
                  <button type="button" className="ghost-button" onClick={clearCanvasFilters} disabled={scene.lens.kind === 'universe'}>Show all notes</button>
                </div>
              </div>
            ) : null}
            {scene.lens.kind === 'workspace' && visibleNotes.length === 0 ? <div className="lens-empty-state">No notes are anchored in this workspace yet. Keep the scope, then capture or assign notes into it.</div> : null}
            {scene.lens.kind === 'project' && visibleNotes.length === 0 ? <div className="lens-empty-state">No notes are attached to this project yet. Add a project inside a note to give it a calm shared cluster.</div> : null}
          </div>
        </section>

        <AIPanel
          panel={scene.aiPanel}
          isOpen={thinkingRailVisible}
          selectedNote={activeNote}
          contextLabel={lensPresentation.lensLabel}
          notes={scene.notes}
          streamedResponse={streamingResponse}
          timelineEntries={activeInsightTimeline}
          streaming={isStreamingResponse}
          onToggle={() => setExpandedSurface(thinkingRailVisible ? 'none' : 'thinking')}
          onModeChange={(mode) => setAIPanel({ mode })}
          onQueryChange={(query) => setAIPanel({ query })}
          onRun={runInsights}
          onOpenReference={openAIReference}
          pendingAction={pendingAction}
          onPreviewAction={setPendingAction}
          onConfirmAction={confirmPendingAction}
          onCancelAction={cancelPendingAction}
          width={thinkingRailWidth}
          onWidthChange={setThinkingRailWidth}
        />
      </section>

      {/* Stacking contract: backdrop (z5) < relationship web (z6) < modal shell (z8). */}
      {activeNote ? <button type="button" className="canvas-dim" aria-label="Close note" onClick={closeActiveNote} /> : null}
      {activeNote ? <RelationshipWeb activeNote={activeNote} notes={visibleNotes} relatedNotes={focusLensPresentation.relatedNotes} filter={relationshipFilter} canvasMetrics={canvasMetrics} hoveredNoteId={hoveredNoteId} onInspectRelationship={inspectRelationship} onOpenRelated={traverseToRelated} onHoverRelatedNote={onHoverStart} onClearRelatedHover={onHoverEnd} /> : null}

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
        activeProjectRevealId={lensPresentation.activeProject?.id ?? null}
        activeWorkspaceLensId={lensPresentation.activeWorkspace?.id ?? null}
        thinkingActive={thinkingRailVisible}
        hasFreshInsights={hasFreshInsights}
        initialPosition={activeNote ? notePanelPositions[activeNote.id] : undefined}
        rightInset={thinkingRailReservedInset}
        bottomInset={captureDockInset}
        onClose={closeActiveNote}
        onThinkAboutNote={() => setExpandedSurface('thinking')}
        onDelete={deleteActiveNote}
        onChange={(id, updates) => {
          const trace = 'title' in updates || 'body' in updates ? 'refined' : 'idle';
          updateNote(id, updates, trace);
        }}
        onArchive={onArchiveNote}
        onRestoreArchive={restoreArchivedNote}
        onOpenRelated={traverseToRelated}
        onInspectRelationship={inspectRelationship}
        onCloseRelationshipInspector={closeRelationshipInspector}
        onCreateExplicitLink={createExplicitRelationship}
        onCreateInlineLinkedNote={createInlineLinkedNote}
        onConfirmRelationship={confirmRelationship}
        onPromoteFragmentToTask={promoteNoteFragmentToTask}
        onSetTaskState={setTaskState}
        onUpdateRelationship={updateRelationship}
        onRemoveRelationship={removeRelationship}
        onUndoRelationshipEdit={undoRelationshipEdit}
        onToggleFocus={toggleNoteFocus}
        onSetProjectIds={setNoteProjects}
        onCreateProject={createProjectForNote}
        onSetWorkspaceId={setNoteWorkspace}
        onCreateWorkspace={createWorkspaceForNote}
        onSetProjectLens={(projectId) => setLens(projectId ? { kind: 'project', projectId, mode: 'context' } : { kind: 'universe' })}
        onSetWorkspaceLens={(workspaceId) => setLens(workspaceId ? { kind: 'workspace', workspaceId, mode: 'context' } : { kind: 'universe' })}
        onAddAttachments={addAttachmentsToActiveNote}
        onRemoveAttachment={removeAttachment}
        onRetryAttachment={retryAttachmentProcessing}
        onHoverRelatedNote={onHoverStart}
        onClearRelatedHover={onHoverEnd}
        focusLensRelatedNotes={focusLensPresentation.relatedNotes}
        focusLensOverflowCount={focusLensPresentation.overflowCount}
        hoveredRelatedNoteId={hoveredNoteId}
        focusLensCanGoBack={focusLensPresentation.canGoBack}
        focusLensPinned={focusLensPresentation.pinned}
        onFocusLensBack={goBackFocusLens}
        onFocusLensPin={pinFocusLens}
        onFocusLensReset={resetFocusLens}
        onPositionChange={(noteId, position) => setNotePanelPositions((current) => ({ ...current, [noteId]: position }))}
      />

      <CaptureComposer
        isOpen={captureExpanded}
        value={scene.captureComposer.draft}
        onChange={onCaptureDraftChange}
        onCommit={commitCapture}
        onCancel={cancelCapture}
        onUndo={undoLastCapture}
        onExpand={() => onCaptureDraftChange(scene.captureComposer.draft)}
        canUndo={Boolean(scene.captureComposer.lastCreatedNoteId)}
      />

      {recentlyDeletedNoteId ? (
        <div className="undo-toast" role="status" aria-live="polite">
          <span>Note moved to trash.</span>
          <button type="button" className="ghost-button" onClick={undoDelete}>Undo</button>
        </div>
      ) : null}
    </ThinkingSurface>
  );
}
