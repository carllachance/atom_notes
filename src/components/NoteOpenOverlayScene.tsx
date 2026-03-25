import type { ComponentProps, ComponentType, ReactNode } from 'react';
import { FocusLensRelatedNote } from '../scene/focusLens';
import { NoteCardModel, Project, Workspace } from '../types';
import { ExpandedNote } from './ExpandedNote';
import { RelationshipWeb } from './RelationshipWeb';
import { SpatialCanvas } from './SpatialCanvas';

type SpatialCanvasComponent = ComponentType<ComponentProps<typeof SpatialCanvas>>;
type RelationshipWebComponent = ComponentType<ComponentProps<typeof RelationshipWeb>>;
type ExpandedNoteComponent = ComponentType<ComponentProps<typeof ExpandedNote>>;

type NoteOpenLayerStackProps = {
  activeNote: NoteCardModel | null;
  visibleNotes: NoteCardModel[];
  relatedNotes: FocusLensRelatedNote[];
  relationshipFilter: 'all' | string;
  canvasMetrics: unknown;
  hoveredNoteId: string | null;
  onCloseNote: () => void;
  onInspectRelationship: (relationshipId: string) => void;
  onOpenRelated: (targetNoteId: string, relationshipId: string) => void;
  onHoverRelatedNote: (noteId: string) => void;
  onClearRelatedHover: (noteId: string) => void;
  expandedNote: ReactNode;
  relationshipWebComponent?: RelationshipWebComponent;
  relationshipWebOverride?: ReactNode;
  showBackdrop?: boolean;
  showRelationshipWeb?: boolean;
};

type NoteOpenOverlaySceneProps = {
  notes: NoteCardModel[];
  visibleNotes: NoteCardModel[];
  activeNoteId: string | null;
  activeNoteProjects: Project[];
  activeWorkspace: Workspace | null;
  relatedNotes?: FocusLensRelatedNote[];
  relationshipFilter?: 'all' | string;
  canvasMetrics?: unknown;
  hoveredNoteId?: string | null;
  onOpenNote: (noteId: string) => void;
  onCloseNote: () => void;
  onInspectRelationship?: (relationshipId: string) => void;
  onOpenRelated?: (targetNoteId: string, relationshipId: string) => void;
  onHoverRelatedNote?: (noteId: string) => void;
  onClearRelatedHover?: (noteId: string) => void;
  spatialCanvasProps: Omit<ComponentProps<typeof SpatialCanvas>, 'notes' | 'activeNoteId' | 'onOpen'>;
  expandedNoteProps: Omit<ComponentProps<typeof ExpandedNote>, 'note' | 'notes' | 'noteProjects' | 'noteWorkspace'>;
  relationshipWebOverride?: ReactNode;
  mobileNoteMode?: boolean;
  components?: {
    SpatialCanvasComponent?: SpatialCanvasComponent;
    RelationshipWebComponent?: RelationshipWebComponent;
    ExpandedNoteComponent?: ExpandedNoteComponent;
  };
};

export function NoteOpenLayerStack({
  activeNote,
  visibleNotes,
  relatedNotes,
  relationshipFilter,
  canvasMetrics,
  hoveredNoteId,
  onCloseNote,
  onInspectRelationship,
  onOpenRelated,
  onHoverRelatedNote,
  onClearRelatedHover,
  expandedNote,
  relationshipWebComponent: RelationshipWebComponent = RelationshipWeb,
  relationshipWebOverride,
  showBackdrop = true,
  showRelationshipWeb = true
}: NoteOpenLayerStackProps) {
  const relationshipWeb = activeNote && showRelationshipWeb
    ? (relationshipWebOverride ?? (
      <RelationshipWebComponent
        activeNote={activeNote}
        notes={visibleNotes}
        relatedNotes={relatedNotes}
        filter={relationshipFilter as any}
        canvasMetrics={canvasMetrics as any}
        hoveredNoteId={hoveredNoteId}
        onInspectRelationship={onInspectRelationship}
        onOpenRelated={onOpenRelated}
        onHoverRelatedNote={onHoverRelatedNote}
        onClearRelatedHover={onClearRelatedHover}
      />
    ))
    : null;

  return (
    <>
      {activeNote && showBackdrop ? <button type="button" className="canvas-dim" aria-label="Close note" onClick={onCloseNote} /> : null}
      {relationshipWeb}
      {expandedNote}
    </>
  );
}

export function NoteOpenOverlayScene({
  notes,
  visibleNotes,
  activeNoteId,
  activeNoteProjects,
  activeWorkspace,
  relatedNotes = [],
  relationshipFilter = 'all',
  canvasMetrics = null,
  hoveredNoteId = null,
  onOpenNote,
  onCloseNote,
  onInspectRelationship = () => {},
  onOpenRelated = () => {},
  onHoverRelatedNote = () => {},
  onClearRelatedHover = () => {},
  spatialCanvasProps,
  expandedNoteProps,
  relationshipWebOverride,
  mobileNoteMode = false,
  components
}: NoteOpenOverlaySceneProps) {
  const activeNote = activeNoteId ? notes.find((note) => note.id === activeNoteId) ?? null : null;
  const CanvasComponent = components?.SpatialCanvasComponent ?? SpatialCanvas;
  const ExpandedNoteComponent = components?.ExpandedNoteComponent ?? ExpandedNote;

  return (
    <>
      {!activeNote ? (
        <CanvasComponent
          {...spatialCanvasProps}
          notes={visibleNotes}
          activeNoteId={activeNoteId}
          onOpen={onOpenNote}
        />
      ) : null}
      <NoteOpenLayerStack
        activeNote={activeNote}
        visibleNotes={visibleNotes}
        relatedNotes={relatedNotes}
        relationshipFilter={relationshipFilter}
        canvasMetrics={canvasMetrics}
        hoveredNoteId={hoveredNoteId}
        onCloseNote={onCloseNote}
        onInspectRelationship={onInspectRelationship}
        onOpenRelated={onOpenRelated}
        onHoverRelatedNote={onHoverRelatedNote}
        onClearRelatedHover={onClearRelatedHover}
        relationshipWebComponent={components?.RelationshipWebComponent}
        relationshipWebOverride={relationshipWebOverride}
        showBackdrop={!mobileNoteMode}
        showRelationshipWeb={!mobileNoteMode}
        expandedNote={activeNote ? (
          <ExpandedNoteComponent
            {...expandedNoteProps}
            note={activeNote}
            notes={notes}
            noteProjects={activeNoteProjects}
            noteWorkspace={activeWorkspace}
          />
        ) : null}
      />
    </>
  );
}
