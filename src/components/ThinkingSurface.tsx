import { useEffect, useMemo, useRef, useState } from 'react';
import type { SceneState, NoteCardModel } from '../types';
import { RecallBand } from './RecallBand';
import { SpatialCanvas } from './SpatialCanvas';
import { ExpandedNote } from './ExpandedNote';
import { AnchorRow } from './AnchorRow';
import { ArchiveView } from './ArchiveView';
import { CaptureBox } from './CaptureBox';

const STORAGE_KEY = 'atom-notes-scene-v1';

const now = () => Date.now();
const createId = () => `${now()}-${Math.random().toString(16).slice(2)}`;

const initialState: SceneState = {
  surfaceVisible: true,
  captureOpen: false,
  activeView: 'canvas',
  selectedCardId: null,
  cards: [
    {
      id: createId(),
      title: 'Welcome to Atom Notes',
      body: 'Drag me around. Ctrl+Shift+N opens quick capture.',
      x: 72,
      y: 88,
      archived: false,
      createdAt: now(),
      updatedAt: now(),
    },
  ],
};

const loadScene = (): SceneState => {
  const sceneRaw = localStorage.getItem(STORAGE_KEY);
  if (!sceneRaw) return initialState;
  try {
    const parsed = JSON.parse(sceneRaw) as SceneState;
    return parsed;
  } catch {
    return initialState;
  }
};

export function ThinkingSurface() {
  const [scene, setScene] = useState<SceneState>(() => loadScene());
  const ctrlTapRef = useRef<number>(0);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scene));
  }, [scene]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Control') {
        const delta = event.timeStamp - ctrlTapRef.current;
        if (delta < 325) {
          setScene((prev) => ({ ...prev, surfaceVisible: !prev.surfaceVisible }));
          ctrlTapRef.current = 0;
          return;
        }
        ctrlTapRef.current = event.timeStamp;
      }

      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        setScene((prev) => ({ ...prev, surfaceVisible: true, captureOpen: true }));
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const selectedCard = useMemo(
    () => scene.cards.find((card) => card.id === scene.selectedCardId) ?? null,
    [scene.cards, scene.selectedCardId],
  );

  const updateCard = (cardId: string, updates: Partial<NoteCardModel>) => {
    setScene((prev) => ({
      ...prev,
      cards: prev.cards.map((card) =>
        card.id === cardId ? { ...card, ...updates, updatedAt: now() } : card,
      ),
    }));
  };

  if (!scene.surfaceVisible) {
    return <div className="hotkey-hint">Atom Notes hidden · double tap Ctrl to reopen</div>;
  }

  return (
    <div className="thinking-surface">
      <RecallBand
        activeCount={scene.cards.filter((card) => !card.archived).length}
        archivedCount={scene.cards.filter((card) => card.archived).length}
        onQuickCapture={() => setScene((prev) => ({ ...prev, captureOpen: true }))}
      />
      <AnchorRow
        activeView={scene.activeView}
        onSwitch={(view) => setScene((prev) => ({ ...prev, activeView: view }))}
      />

      {scene.activeView === 'canvas' ? (
        <SpatialCanvas
          cards={scene.cards.filter((card) => !card.archived)}
          selectedCardId={scene.selectedCardId}
          onSelect={(id) => setScene((prev) => ({ ...prev, selectedCardId: id }))}
          onMove={(id, x, y) => updateCard(id, { x, y })}
          onArchive={(id) => updateCard(id, { archived: true })}
        />
      ) : (
        <ArchiveView
          cards={scene.cards.filter((card) => card.archived)}
          onRestore={(id) => updateCard(id, { archived: false })}
        />
      )}

      <ExpandedNote
        card={selectedCard}
        onClose={() => setScene((prev) => ({ ...prev, selectedCardId: null }))}
        onUpdate={(id, updates) => updateCard(id, updates)}
      />

      <CaptureBox
        open={scene.captureOpen}
        onDismiss={() => setScene((prev) => ({ ...prev, captureOpen: false }))}
        onCapture={(title, body) => {
          const newCard: NoteCardModel = {
            id: createId(),
            title,
            body,
            x: 120 + Math.random() * 280,
            y: 120 + Math.random() * 220,
            archived: false,
            createdAt: now(),
            updatedAt: now(),
          };

          setScene((prev) => ({
            ...prev,
            captureOpen: false,
            activeView: 'canvas',
            selectedCardId: newCard.id,
            cards: [...prev.cards, newCard],
          }));
        }}
      />
    </div>
  );
}
