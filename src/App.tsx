import { useState } from 'react';
import { AIPanel } from './components/AIPanel';
import { CaptureComposer } from './components/CaptureComposer';
import { ExpandedNote } from './components/ExpandedNote';
import { HomeSurface } from './components/HomeSurface';
import { RecallBand } from './components/RecallBand';
import { RecallPrompt } from './components/RecallPrompt';
import { RelationshipWeb } from './components/RelationshipWeb';
import { CanvasViewportMetrics } from './components/relationshipWebGeometry';
import { SpatialCanvas } from './components/SpatialCanvas';
import { ThinkingSurface } from './components/ThinkingSurface';
import { useSceneController } from './scene/useSceneController';

export function App() {
  const [canvasMetrics, setCanvasMetrics] = useState<CanvasViewportMetrics | null>(null);
  const [notePanelPositions, setNotePanelPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [thinkingRailWidth, setThinkingRailWidth] = useState(360);
  const demoLinks = [{ href: '/query-prototype', label: 'Query demo' }];

  const {
    scene,
    activeNote,
    activeNoteProjects,
    activeWorkspace,
    visibleNotes,
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
    updateNote,
    bringToFront,
    setIsDragging,
    setLens,
    setFocusMode,
    setAIPanel,
    setAIPanelVisibility,
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
  const thinkingRailVisible = scene.aiPanel.state !== 'hidden';
  const thinkingRailReservedInset = thinkingRailVisible ? thinkingRailWidth + 24 : 24;
  const hasFreshInsights = Boolean(
    activeNote && (
      isStreamingResponse ||
      activeInsightTimeline.some((entry) => Date.now() - entry.createdAt < 1000 * 60 * 60)
    )
  );

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
        onRevealQueryChange={onRevealQueryChange}
        onReveal={onReveal}
        onRevealPrev={onRevealPrev}
        onRevealNext={onRevealNext}
        demoLinks={demoLinks}
      />

      {recallCue ? (
        <RecallPrompt
          noteTitle={recallCue.noteTitle}
          suggestedNextStep={recallCue.suggestedNextStep}
          onAdvance={onAdvanceRecallCue}
          onClear={onClearRecallCue}
        />
      ) : null}

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
            {scene.lens.kind === 'workspace' && visibleNotes.length === 0 ? <div className="lens-empty-state">No notes are anchored in this workspace yet. Keep the scope, then capture or assign notes into it.</div> : null}
            {scene.lens.kind === 'project' && visibleNotes.length === 0 ? <div className="lens-empty-state">No notes are attached to this project yet. Add a project inside a note to give it a calm shared cluster.</div> : null}
          </div>
        </section>

        <AIPanel
          panel={scene.aiPanel}
          selectedNote={activeNote}
          visibleNotesCount={visibleNotes.length}
          activeProject={lensPresentation.activeProject}
          activeWorkspace={lensPresentation.activeWorkspace}
          scopeLabel={lensPresentation.lensLabel}
          notes={scene.notes}
          streamedResponse={streamingResponse}
          timelineEntries={activeInsightTimeline}
          streaming={isStreamingResponse}
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
          width={thinkingRailWidth}
          onWidthChange={setThinkingRailWidth}
        />
      </section>

      {activeNote ? <button type="button" className="canvas-dim" aria-label="Close note" onClick={closeActiveNote} /> : null}
      {activeNote ? <RelationshipWeb activeNote={activeNote} notes={visibleNotes} rankedRelationships={rankedRelationships} filter={relationshipFilter} canvasMetrics={canvasMetrics} hoveredNoteId={hoveredNoteId} onInspectRelationship={inspectRelationship} /> : null}

      <CaptureComposer
        isOpen={scene.captureComposer.open}
        value={scene.captureComposer.draft}
        onChange={onCaptureDraftChange}
        onCommit={commitCapture}
        onCancel={cancelCapture}
        onUndo={undoLastCapture}
        onExpand={() => onCaptureDraftChange(scene.captureComposer.draft)}
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
        activeProjectRevealId={lensPresentation.activeProject?.id ?? null}
        activeWorkspaceLensId={lensPresentation.activeWorkspace?.id ?? null}
        thinkingActive={thinkingRailVisible}
        hasFreshInsights={hasFreshInsights}
        initialPosition={activeNote ? notePanelPositions[activeNote.id] : undefined}
        rightInset={thinkingRailReservedInset}
        onClose={closeActiveNote}
        onThinkAboutNote={() => setAIPanelVisibility('open')}
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
        onPositionChange={(noteId, position) => setNotePanelPositions((current) => ({ ...current, [noteId]: position }))}
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
