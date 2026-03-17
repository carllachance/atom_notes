import type { NoteCardModel } from '../types';
import { NoteCard } from './NoteCard';

type SpatialCanvasProps = {
  cards: NoteCardModel[];
  selectedCardId: string | null;
  onSelect: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  onArchive: (id: string) => void;
};

export function SpatialCanvas({ cards, selectedCardId, onSelect, onMove, onArchive }: SpatialCanvasProps) {
  return (
    <section className="spatial-canvas">
      {cards.map((card) => (
        <NoteCard
          key={card.id}
          card={card}
          selected={selectedCardId === card.id}
          onSelect={onSelect}
          onMove={onMove}
          onArchive={onArchive}
        />
      ))}
    </section>
  );
}
