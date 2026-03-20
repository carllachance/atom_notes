import type { ComponentProps, ComponentType } from 'react';
import { FocusLensRelatedNote } from '../scene/focusLens';
import { NoteCardModel, Project, RelationshipType, Workspace } from '../types';
import { ExpandedNote } from './ExpandedNote';
import { RelationshipWeb } from './RelationshipWeb';
import { CanvasViewportMetrics } from './relationshipWebGeometry';
import { SpatialCanvas } from './SpatialCanvas';

type SpatialCanvasComponent = ComponentType<ComponentProps<typeof SpatialCanvas>>;
type RelationshipWebComponent = ComponentType<ComponentProps<typeof RelationshipWeb>>;
type ExpandedNoteComponent = ComponentType<ComponentProps<typeof ExpandedNote>>;

type NoteOpenOverlaySceneProps = {
  notes: NoteCardModel[];
  visibleNotes: NoteCardModel[];
  activeNoteId: string | null;
  activeNoteProjects: Project[];
  activeWorkspace: Workspace | null;
  relatedNotes: FocusLensRelatedNote[];
  relationshipFilter: 'all' | RelationshipType;
  canvasMetrics: CanvasViewportMetrics | null;
  hoveredNoteId: string | null;
  onOpenNote: (noteId: string) => void;
  onCloseNote: () => void;
  onInspectRelationship: (relationshipId: string) => void;
  onOpenRelated: (targetNoteId: string, relationshipId: string) => void;
  onHoverRelatedNote: (noteId: string) => void;
  onClearRelatedHover: (noteId: string) => void;
  spatialCanvasProps: Omit<ComponentProps<typeof SpatialCanvas>, 'notes' | 'activeNoteId' | 'onOpen'>;
  expandedNoteProps: Omit<ComponentProps<typeof ExpandedNote>, 'note' | 'notes' | 'noteProjects' | 'noteWorkspace'>;
  components?: {
    SpatialCanvasComponent?: SpatialCanvasComponent;
    RelationshipWebComponent?: RelationshipWebComponent;
    ExpandedNoteComponent?: ExpandedNoteComponent;
  };
};

export function NoteOpenOverlayScene({
  notes,
  visibleNotes,
  activeNoteId,
  activeNoteProjects,
  activeWorkspace,
  relatedNotes,
  relationshipFilter,
  canvasMetrics,
  hoveredNoteId,
  onOpenNote,
  onCloseNote,
  onInspectRelationship,
  onOpenRelated,
  onHoverRelatedNote,
  onClearRelatedHover,
  spatialCanvasProps,
  expandedNoteProps,
  components
}: NoteOpenOverlaySceneProps) {
  const activeNote = activeNoteId ? notes.find((note) => note.id === activeNoteId) ?? null : null;
  const CanvasComponent = components?.SpatialCanvasComponent ?? SpatialCanvas;
  const RelationshipWebComponent = components?.RelationshipWebComponent ?? RelationshipWeb;
  const ExpandedNoteComponent = components?.ExpandedNoteComponent ?? ExpandedNote;

  return (
    <>
      <CanvasComponent
        {...spatialCanvasProps}
        notes={visibleNotes}
        activeNoteId={activeNote?.id ?? null}
        onOpen={onOpenNote}
      />

      {activeNote ? <button type="button" className="canvas-dim" aria-label="Close note" onClick={onCloseNote} /> : null}
      {activeNote ? (
        <RelationshipWebComponent
          activeNote={activeNote}
          notes={visibleNotes}
          relatedNotes={relatedNotes}
          filter={relationshipFilter}
          canvasMetrics={canvasMetrics}
          hoveredNoteId={hoveredNoteId}
          onInspectRelationship={onInspectRelationship}
          onOpenRelated={onOpenRelated}
          onHoverRelatedNote={onHoverRelatedNote}
          onClearRelatedHover={onClearRelatedHover}
        />
      ) : null}
      <ExpandedNoteComponent
        {...expandedNoteProps}
        note={activeNote}
        notes={notes}
        noteProjects={activeNoteProjects}
        noteWorkspace={activeWorkspace}
      />
    </>
  );
}
