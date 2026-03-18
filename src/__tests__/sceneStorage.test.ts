import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { loadScene, saveScene, SCENE_KEY } from '../scene/sceneStorage';
import { createRevealQueryLens } from '../scene/lens';
import { SceneState } from '../types';

function makeStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear()
  };
}

describe('sceneStorage load/save normalization', () => {
  beforeEach(() => {
    const local = makeStorage();
    Object.defineProperty(globalThis, 'localStorage', { value: local, configurable: true });
  });

  it('loads fallback scene when no persisted data exists', () => {
    const originalNow = Date.now;
    const originalUuid = globalThis.crypto.randomUUID;
    Date.now = () => 5_000;
    globalThis.crypto.randomUUID = (() => 'uuid-1') as unknown as typeof globalThis.crypto.randomUUID;

    try {
      const scene = loadScene();
      assert.equal(scene.notes.length, 1);
      assert.deepEqual(
        {
          id: scene.notes[0].id,
          body: scene.notes[0].body,
          trace: scene.notes[0].trace,
          workspaceId: scene.notes[0].workspaceId,
          projectIds: scene.notes[0].projectIds
        },
        {
          id: 'uuid-1',
          body: 'Welcome to Atom Notes\nDrag this card around.',
          trace: 'captured',
          workspaceId: null,
          projectIds: []
        }
      );
    } finally {
      Date.now = originalNow;
      globalThis.crypto.randomUUID = originalUuid;
    }
  });

  it('loads and normalizes persisted legacy scene data and saves structured lens state', () => {
    const originalNow = Date.now;
    const originalUuid = globalThis.crypto.randomUUID;
    Date.now = () => 5_000;
    globalThis.crypto.randomUUID = (() => 'uuid-1') as unknown as typeof globalThis.crypto.randomUUID;

    try {
      const raw = JSON.stringify({
        notes: [{ id: 7, title: '  ', body: 'hello', stateCue: 'legacy', workspace: 'research', projects: ['atlas'] }],
        relationships: [{ fromId: '7', toId: '7', type: 'references', explicitness: 'explicit', state: 'confirmed' }],
        activeNoteId: '7',
        quickCaptureOpen: true,
        lens: { kind: 'reveal', mode: 'query', query: 'hello', workspaceId: 'research' }
      });
      localStorage.setItem('atom-notes.scene.v1', raw);

      const loaded = loadScene();
      assert.deepEqual(
        {
          id: loaded.notes[0].id,
          title: loaded.notes[0].title,
          body: loaded.notes[0].body,
          workspaceId: loaded.notes[0].workspaceId,
          projectIds: loaded.notes[0].projectIds
        },
        { id: '7', title: null, body: 'hello', workspaceId: 'research', projectIds: ['atlas'] }
      );
      assert.deepEqual(
        {
          fromId: loaded.relationships[0].fromId,
          toId: loaded.relationships[0].toId,
          type: loaded.relationships[0].type
        },
        { fromId: '7', toId: '7', type: 'references' }
      );
      assert.deepEqual(loaded.lens, createRevealQueryLens('hello', 'research'));

      const sceneToSave = loaded as SceneState;
      saveScene(sceneToSave);
      const persisted = JSON.parse(localStorage.getItem(SCENE_KEY) as string) as SceneState;
      assert.equal(persisted.activeNoteId, loaded.activeNoteId);
      assert.equal(persisted.notes[0].id, '7');
      assert.deepEqual(persisted.lens, createRevealQueryLens('hello', 'research'));
    } finally {
      Date.now = originalNow;
      globalThis.crypto.randomUUID = originalUuid;
    }
  });
});
