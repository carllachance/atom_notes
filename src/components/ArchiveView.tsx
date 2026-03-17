import type { NoteCardModel } from '../types';

type ArchiveViewProps = {
  cards: NoteCardModel[];
  onRestore: (id: string) => void;
};

export function ArchiveView({ cards, onRestore }: ArchiveViewProps) {
  return (
    <section className="archive-view">
      {cards.length === 0 ? <p>No archived notes yet.</p> : null}
      {cards.map((card) => (
        <article key={card.id}>
          <h3>{card.title}</h3>
          <p>{card.body}</p>
          <button onClick={() => onRestore(card.id)}>Restore</button>
        </article>
      ))}
    </section>
  );
}
