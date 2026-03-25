import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AIPanel } from './components/AIPanel';
import { CaptureComposer } from './components/CaptureComposer';
import { ExpandedNote } from './components/ExpandedNote';
import { HomeSurface } from './components/HomeSurface';
import { NoteOpenOverlayScene } from './components/NoteOpenOverlayScene';
import { RecallBand } from './components/RecallBand';
import { RelationshipWeb } from './components/RelationshipWeb';
import { ShelfView } from './components/ShelfView';
import { CanvasViewportMetrics } from './components/relationshipWebGeometry';
import { SpatialCanvas } from './components/SpatialCanvas';
import { ThinkingSurface } from './components/ThinkingSurface';
import { summarizeCanvasVisibility } from './scene/canvasVisibility';
import { useSceneController } from './scene/useSceneController';
import { buildMemorySummary } from './store/memorySummary';
import { createBookmark, recordHistoryEntry, useBookmarks, useHistoryStack } from './store/sessionSlice';

export function App() {
  const [browseSurface, setBrowseSurface] = useState<'shelf' | 'canvas'>('shelf');
  const [isMobileViewport, setIsMobileViewport] = useState(() => (typeof window !== 'undefined' ? window.matchMedia('(max-width: 900px)').matches : false));
  const [canvasMetrics, setCanvasMetrics] = useState<CanvasViewportMetrics | null>(null);
  const [notePanelPositions, setNotePanelPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [reentryExpanded, setReentryExpanded] = useState(false);
  const [pinDialogOpen, setPinDialogOpen] = useState(false);

  // DG-2 AN-007/AN-008: Re-entry hooks
  const historyStack = useHistoryStack();
  const bookmarks = useBookmarks();
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
  const captureCompactedForOpenNote = isMobileViewport && Boolean(activeNote);
  const thinkingRailReservedInset = thinkingRailVisible ? thinkingRailWidth + 24 : 24;
  const captureDockInset = captureCompactedForOpenNote ? 12 : captureExpanded ? 236 : 88;
  const hasFreshInsights = Boolean(
    activeNote && (
      isStreamingResponse ||
      activeInsightTimeline.some((entry) => Date.now() - entry.createdAt < 1000 * 60 * 60)
    )
  );
  const memorySummary = useMemo(
    () => buildMemorySummary(historyStack, bookmarks, scene.notes, activeNote?.id ?? null),
    [historyStack, bookmarks, scene.notes, activeNote?.id]
  );

  useEffect(() => {
    if (hasAutoRecoveredRef.current) return;
    if (!canvasVisibility.isBlankBecauseNotesAreOffCanvas) return;
    hasAutoRecoveredRef.current = true;
    fitAllNotes();
  }, [canvasVisibility.isBlankBecauseNotesAreOffCanvas, fitAllNotes]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(max-width: 900px)');
    const onChange = (event: MediaQueryListEvent) => setIsMobileViewport(event.matches);
    setIsMobileViewport(mediaQuery.matches);
    mediaQuery.addEventListener('change', onChange);
    return () => mediaQuery.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    recordHistoryEntry(activeNote?.id ?? null, activeNote?.title ?? null, scene.lens, scene.focusMode);
  }, [activeNote?.id, activeNote?.title, scene.lens, scene.focusMode]);

  // DG-2 AN-007/AN-008/AN-009: Re-entry handlers
  const handleRestoreHistory = useCallback((entry: { noteId: string | null; lensKind: string; focusMode: { highlight: boolean; isolate: boolean } }) => {
    if (entry.noteId) {
      onOpenNote(entry.noteId);
    }
    if (entry.lensKind === 'universe') {
      setLens({ kind: 'universe' });
    } else if (entry.lensKind === 'project') {
      setLens({ kind: 'project', projectId: null, mode: 'context' });
    } else if (entry.lensKind === 'workspace') {
      setLens({ kind: 'workspace', workspaceId: null, mode: 'context' });
    }
    setFocusMode(entry.focusMode);
    setReentryExpanded(false);
  }, [onOpenNote, setLens, setFocusMode]);

  const handleDropPin = useCallback((label: string) => {
    createBookmark(label, activeNote?.id ?? null, scene.lens, scene.focusMode);
    setPinDialogOpen(false);
  }, [activeNote?.id, scene.focusMode, scene.lens]);

  const handleRestoreBookmark = useCallback((bookmark: { activeNoteId: string | null; lens: { kind: string }; focusMode: { highlight: boolean; isolate: boolean } }) => {
    if (bookmark.activeNoteId) {
      onOpenNote(bookmark.activeNoteId);
    }
    setLens(bookmark.lens as any);
    setFocusMode(bookmark.focusMode);
    setReentryExpanded(false);
  }, [onOpenNote, setLens, setFocusMode]);

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
        // DG-2 AN-007/AN-008/AN-009: Re-entry props
        historyStack={historyStack}
        bookmarks={bookmarks}
        memorySummary={memorySummary.summary}
        memorySummarySource={memorySummary.source}
        reentryExpanded={reentryExpanded}
        onToggleReentry={() => setReentryExpanded(!reentryExpanded)}
        onRestoreHistory={handleRestoreHistory}
        onDropPin={handleDropPin}
        onRestoreBookmark={handleRestoreBookmark}
        browseSurface={browseSurface}
        onBrowseSurfaceChange={setBrowseSurface}
        horizonOpen={thinkingRailVisible}
        onToggleHorizon={() => setExpandedSurface(thinkingRailVisible ? 'none' : 'thinking')}
      />

      <section className="workspace-shell">
        <section className="view-stack" data-lens={scene.lens.kind}>
          {!activeNote && browseSurface === 'shelf' ? (
            <ShelfView
              notes={scene.notes}
              relationships={scene.relationships}
              projects={projects}
              workspaces={workspaces}
              onOpenNote={onOpenNote}
            />
          ) : null}
          {!activeNote && browseSurface === 'canvas' ? (
            <HomeSurface
              notes={scene.notes}
              deletedNotes={deletedNotes}
              lastCreatedNoteId={scene.captureComposer.lastCreatedNoteId}
              onOpenNote={onOpenNote}
              onRestoreDeletedNote={restoreDeletedNote}
            />
          ) : null}
          <div className={`view-layer view-layer-canvas ${!activeNote && browseSurface === 'shelf' ? 'view-layer-canvas--hidden' : ''}`}>
            <NoteOpenOverlayScene
              notes={scene.notes}
              visibleNotes={visibleNotes}
              activeNoteId={activeNote?.id ?? null}
              activeNoteProjects={activeNoteProjects}
              activeWorkspace={activeWorkspace}
              relatedNotes={focusLensPresentation.relatedNotes}
              relationshipFilter={relationshipFilter}
              canvasMetrics={canvasMetrics}
              hoveredNoteId={hoveredNoteId}
              onOpenNote={onOpenNote}
              onCloseNote={closeActiveNote}
              onInspectRelationship={inspectRelationship}
              onOpenRelated={traverseToRelated}
              onHoverRelatedNote={onHoverStart}
              onClearRelatedHover={onHoverEnd}
              spatialCanvasProps={{
                noteMetaById: lensPresentation.noteMetaById,
                focusLensStateById: focusLensPresentation.noteStateById,
                focusLensLayoutById: focusLensPresentation.layoutById,
                focusMode: scene.focusMode,
                hoveredNoteId,
                revealMatchedNoteIds: visibleRevealMatchIds,
                revealActiveNoteId,
                initialScrollLeft: scene.canvasScrollLeft,
                initialScrollTop: scene.canvasScrollTop,
                recentlyClosedNoteId,
                relatedGlowNoteIds: ambientRelatedNoteIds,
                pulseNoteId,
                ambientGlowLevel,
                isDragging,
                recenterTarget,
                activeProject: lensPresentation.activeProject,
                projectConnectorSegments: lensPresentation.projectConnectorSegments,
                relationships: scene.relationships,
                onScroll: onCanvasScroll,
                onViewportCenterChange,
                onMetricsChange: setCanvasMetrics,
                onDragStart: () => setIsDragging(true),
                onDragEnd: (id, x, y, moved) => {
                  if (moved) updateNote(id, { x, y }, 'moved');
                  setIsDragging(false);
                },
                onBringToFront: bringToFront,
                onHoverStart,
                onHoverEnd,
                reservedRightInset: 0
              }}
              expandedNoteProps={{
                projects,
                workspaces,
                relationships: relationshipPanelItems,
                inspectedRelationship,
                canUndoRelationshipEdit,
                activeProjectRevealId: lensPresentation.activeProject?.id ?? null,
                activeWorkspaceLensId: lensPresentation.activeWorkspace?.id ?? null,
                thinkingActive: thinkingRailVisible,
                hasFreshInsights,
                initialPosition: activeNote ? notePanelPositions[activeNote.id] : undefined,
                rightInset: thinkingRailReservedInset,
                bottomInset: captureDockInset,
                onClose: closeActiveNote,
                onThinkAboutNote: () => setExpandedSurface('thinking'),
                onDelete: deleteActiveNote,
                onChange: (id, updates) => {
                  const trace = 'title' in updates || 'body' in updates ? 'refined' : 'idle';
                  updateNote(id, updates, trace);
                },
                onArchive: onArchiveNote,
                onRestoreArchive: restoreArchivedNote,
                onOpenRelated: traverseToRelated,
                onInspectRelationship: inspectRelationship,
                onCloseRelationshipInspector: closeRelationshipInspector,
                onCreateExplicitLink: createExplicitRelationship,
                onCreateInlineLinkedNote: createInlineLinkedNote,
                onConfirmRelationship: confirmRelationship,
                onPromoteFragmentToTask: promoteNoteFragmentToTask,
                onSetTaskState: setTaskState,
                onUpdateRelationship: updateRelationship,
                onRemoveRelationship: removeRelationship,
                onUndoRelationshipEdit: undoRelationshipEdit,
                onToggleFocus: toggleNoteFocus,
                onSetProjectIds: setNoteProjects,
                onCreateProject: createProjectForNote,
                onSetWorkspaceId: setNoteWorkspace,
                onCreateWorkspace: createWorkspaceForNote,
                onSetProjectLens: (projectId) => setLens(projectId ? { kind: 'project', projectId, mode: 'context' } : { kind: 'universe' }),
                onSetWorkspaceLens: (workspaceId) => setLens(workspaceId ? { kind: 'workspace', workspaceId, mode: 'context' } : { kind: 'universe' }),
                onAddAttachments: addAttachmentsToActiveNote,
                onRemoveAttachment: removeAttachment,
                onRetryAttachment: retryAttachmentProcessing,
                onHoverRelatedNote: onHoverStart,
                onClearRelatedHover: onHoverEnd,
                focusLensRelatedNotes: focusLensPresentation.relatedNotes,
                focusLensOverflowCount: focusLensPresentation.overflowCount,
                hoveredRelatedNoteId: hoveredNoteId,
                focusLensCanGoBack: focusLensPresentation.canGoBack,
                focusLensPinned: focusLensPresentation.pinned,
                onFocusLensBack: goBackFocusLens,
                onFocusLensPin: pinFocusLens,
                onFocusLensReset: resetFocusLens,
                onPositionChange: (noteId, position) => setNotePanelPositions((current) => ({ ...current, [noteId]: position }))
              }}
              components={{
                SpatialCanvasComponent: SpatialCanvas,
                RelationshipWebComponent: RelationshipWeb,
                ExpandedNoteComponent: ExpandedNote
              }}
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
          // DG-2 AN-015/AN-016: AI interaction mode
          onInteractionModeChange={(mode) => setAIPanel({ interactionMode: mode })}
        />
      </section>

      <CaptureComposer
        isOpen={captureExpanded}
        compactWhenNoteOpen={captureCompactedForOpenNote}
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
