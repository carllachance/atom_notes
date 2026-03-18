import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { loadScene, saveScene, SCENE_KEY } from '../scene/sceneStorage';
import type { SceneState } from '../types';

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

beforeEach((t: any) => {
  const local = makeStorage();
  Object.defineProperty(globalThis, 'localStorage', { value: local, configurable: true });
  t.mock.method(Date, 'now', () => 5_000);
  t.mock.method(globalThis.crypto, 'randomUUID', () => 'uuid-1');
});

test('sceneStorage loads fallback scene when no persisted data exists', () => {
  const scene = loadScene();
  assert.equal(scene.notes.length, 1);
  assert.deepEqual(scene.notes[0], {
    id: 'uuid-1',
    title: null,
    body: 'Welcome to Atom Notes\nDrag this card around.',
    anchors: [],
    trace: 'captured',
    x: 112,
    y: 128,
    z: 1,
    createdAt: 5_000,
    updatedAt: 5_000,
    archived: false,
    inFocus: false,
    projectIds: []
  });
  assert.deepEqual(scene.projects, []);
  assert.deepEqual(scene.projectReveal, { activeProjectId: null, isolate: false });
});

test('sceneStorage loads and normalizes persisted scene data with projects and saves with v3 key', () => {
  const raw = JSON.stringify({
    notes: [{ id: 7, title: '  ', body: 'hello', stateCue: 'legacy', projectIds: ['p-1', 'missing'] }],
    relationships: [{ fromId: '7', toId: '7', type: 'references' }],
    projects: [{ id: 'p-1', key: 'sld', name: 'SLD', color: '#123456', description: 'Ship launch doc' }],
    projectReveal: { activeProjectId: 'p-1', isolate: true },
    activeNoteId: '7',
    quickCaptureOpen: true,
    currentView: 'archive'
  });
  localStorage.setItem('atom-notes.scene.v2', raw);

  const loaded = loadScene();
  assert.equal(loaded.notes[0].id, '7');
  assert.equal(loaded.notes[0].title, null);
  assert.equal(loaded.notes[0].body, 'hello');
  assert.deepEqual(loaded.notes[0].projectIds, ['p-1']);
  assert.equal(loaded.projects[0].key, 'SLD');
  assert.equal(loaded.relationships.length, 0);
  assert.equal(loaded.lens, 'archive');
  assert.deepEqual(loaded.projectReveal, { activeProjectId: 'p-1', isolate: true });

  const sceneToSave = loaded as SceneState;
  saveScene(sceneToSave);
  const persisted = JSON.parse(localStorage.getItem(SCENE_KEY) as string) as SceneState;
  assert.equal(persisted.activeNoteId, loaded.activeNoteId);
  assert.equal(persisted.notes[0].id, '7');
  assert.equal(persisted.projects[0].id, 'p-1');
});
