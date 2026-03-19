import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { demoNotes, demoRelationships, demoWorkspaces } from '../data/demoSeed';
import { loadScene, saveScene, SCENE_KEY } from '../scene/sceneStorage';
import type { SceneState } from '../types';

function makeStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => store.clear()
  };
}

beforeEach((t: any) => {
  const local = makeStorage();
  Object.defineProperty(globalThis, 'localStorage', { value: local, configurable: true });
  t.mock.method(Date, 'now', () => 5_000);
  t.mock.method(globalThis.crypto, 'randomUUID', () => 'uuid-1');
});

test('sceneStorage loads the synthetic demo scene when no persisted data exists', () => {
  const scene = loadScene();
  assert.equal(scene.notes.length, demoNotes.length);
  assert.equal(scene.workspaces.length, demoWorkspaces.length);
  assert.equal(scene.notes[0].title, 'Daily Fed Report Overview');
  assert.match(scene.notes[0].body, /Reference portal/);
  assert.equal(scene.relationships.filter((relationship) => relationship.explicitness === 'explicit').length, demoRelationships.length);
  assert.deepEqual(scene.captureComposer, { draft: '', lastCreatedNoteId: null });
  assert.deepEqual(scene.focusMode, { highlight: true, isolate: false });
  assert.equal(scene.expandedSecondarySurface, 'none');
});

test('sceneStorage upgrades the legacy welcome seed to the synthetic demo scene', () => {
  localStorage.setItem(
    'atom-notes.scene.v5',
    JSON.stringify({
      notes: [{ id: 'welcome', title: 'Welcome to Atom Notes', body: 'Drag this card around.' }],
      relationships: [],
      projects: [],
      workspaces: []
    })
  );

  const scene = loadScene();
  assert.equal(scene.notes.length, demoNotes.length);
  assert.equal(scene.notes.some((note) => note.id === 'welcome'), false);
});

test('sceneStorage migrates legacy project reveal state into a formal project lens and persists workspaces', () => {
  const raw = JSON.stringify({
    notes: [{ id: 7, title: '  ', body: 'hello', workspaceId: 'w-1', projectIds: ['p-1', 'missing'] }],
    relationships: [{ fromId: '7', toId: '7', type: 'references' }],
    projects: [{ id: 'p-1', key: 'sld', name: 'SLD', color: '#123456', description: 'Ship launch doc' }],
    workspaces: [{ id: 'w-1', key: 'ops', name: 'Operations', color: '#abcdef', description: 'Ops scope' }],
    projectReveal: { activeProjectId: 'p-1', isolate: true },
    activeNoteId: '7',
    quickCaptureOpen: true
  });
  localStorage.setItem('atom-notes.scene.v4', raw);
  const loaded = loadScene();
  assert.equal(loaded.notes[0].workspaceId, 'w-1');
  assert.equal(loaded.workspaces[0].key, 'OPS');
  assert.deepEqual(loaded.lens, { kind: 'project', projectId: 'p-1', mode: 'strict' });
  assert.equal(loaded.expandedSecondarySurface, 'capture');
  saveScene(loaded as SceneState);
  const persisted = JSON.parse(localStorage.getItem(SCENE_KEY) as string) as SceneState;
  assert.equal(persisted.projects[0].id, 'p-1');
  assert.equal(persisted.workspaces[0].id, 'w-1');
});
