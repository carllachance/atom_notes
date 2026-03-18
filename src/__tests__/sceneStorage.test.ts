import { beforeEach, describe, expect, it, vi } from '../test/vitest';
import { loadScene, saveScene, SCENE_KEY } from '../scene/sceneStorage';
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
    vi.spyOn(Date, 'now').mockReturnValue(5_000);
    vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue('uuid-1');
  });

  it('loads fallback scene when no persisted data exists', () => {
    const scene = loadScene();
    expect(scene.notes).toHaveLength(1);
    expect(scene.notes[0]).toMatchObject({
      id: 'uuid-1',
      body: 'Welcome to Atom Notes\nDrag this card around.',
      trace: 'captured',
      projectIds: []
    });
    expect(scene.projects).toEqual([]);
    expect(scene.projectReveal).toEqual({ activeProjectId: null });
  });

  it('loads and normalizes persisted legacy scene data and saves with v2 key', () => {
    const raw = JSON.stringify({
      notes: [{ id: 7, title: '  ', body: 'hello', stateCue: 'legacy', projectIds: ['sld'] }],
      relationships: [{ fromId: '7', toId: '7', type: 'references' }],
      activeNoteId: '7',
      quickCaptureOpen: true,
      currentView: 'archive'
    });
    localStorage.setItem('atom-notes.scene.v1', raw);

    const loaded = loadScene();
    expect(loaded.notes[0]).toMatchObject({ id: '7', title: null, body: 'hello', projectIds: ['sld'] });
    expect(loaded.projects[0]).toMatchObject({ id: 'sld', name: 'sld' });
    expect(loaded.relationships).toEqual([]);
    expect(loaded.lens).toBe('archive');

    const sceneToSave = loaded as SceneState;
    saveScene(sceneToSave);
    const persisted = JSON.parse(localStorage.getItem(SCENE_KEY) as string) as SceneState;
    expect(persisted.activeNoteId).toBe(loaded.activeNoteId);
    expect(persisted.notes[0].id).toBe('7');
    expect(persisted.projects[0].id).toBe('sld');
  });
});
