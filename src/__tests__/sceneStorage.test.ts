import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { demoNotes, demoRelationships, demoWorkspaces } from '../data/demoSeed';
import { getSceneStoreMode, loadScene, loadSceneForMode, saveScene, saveSceneForMode, SCENE_KEY, setSceneStoreMode } from '../scene/sceneStorage';
import { STUDY_PERSISTENCE_KEY } from '../learning/studyPersistence';
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

test('sceneStorage can switch to a blank local workspace', () => {
  setSceneStoreMode('blank');
  const scene = loadScene();
  assert.equal(getSceneStoreMode(), 'blank');
  assert.equal(scene.notes.length, 0);
  assert.equal(scene.projects.length, 0);
  assert.equal(scene.workspaces.length, 0);
});

test('sceneStorage keeps sample and blank workspaces separate', () => {
  const sampleScene = loadSceneForMode('sample');
  const blankScene = loadSceneForMode('blank');

  saveSceneForMode({
    ...blankScene,
    notes: [{
      id: 'blank-note',
      title: 'My note',
      body: 'Fresh workspace',
      anchors: [],
      trace: 'idle',
      x: 0,
      y: 0,
      z: 1,
      createdAt: 1,
      updatedAt: 1,
      archived: false,
      deleted: false,
      deletedAt: null,
      projectIds: [],
      workspaceIds: [],
      workspaceId: null
    }],
  }, 'blank');

  assert.equal(loadSceneForMode('sample').notes.length, sampleScene.notes.length);
  assert.equal(loadSceneForMode('blank').notes[0]?.id, 'blank-note');
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
  assert.equal(loaded.expandedSecondarySurface, 'none');
  saveScene(loaded as SceneState);
  const persisted = JSON.parse(localStorage.getItem(SCENE_KEY) as string) as SceneState;
  assert.equal(persisted.projects[0].id, 'p-1');
  assert.equal(persisted.workspaces[0].id, 'w-1');
});

test('sceneStorage fails safe for invalid restored open-note state', () => {
  localStorage.setItem(
    SCENE_KEY,
    JSON.stringify({
      notes: [{ id: 'n-archived', title: 'Archived', body: 'Body', archived: true }],
      relationships: [],
      projects: [],
      workspaces: [],
      activeNoteId: 'n-archived',
      expandedSecondarySurface: 'capture'
    })
  );

  const loaded = loadScene();
  assert.equal(loaded.activeNoteId, null);
  assert.equal(loaded.expandedSecondarySurface, 'capture');
});

test('sceneStorage keeps valid restored open-note state but suppresses capture surface', () => {
  localStorage.setItem(
    SCENE_KEY,
    JSON.stringify({
      notes: [{ id: 'n-open', title: 'Open', body: 'Body' }],
      relationships: [],
      projects: [],
      workspaces: [],
      activeNoteId: 'n-open',
      expandedSecondarySurface: 'capture'
    })
  );

  const loaded = loadScene();
  assert.equal(loaded.activeNoteId, 'n-open');
  assert.equal(loaded.expandedSecondarySurface, 'none');
});

test('sceneStorage persists source health and note verification fields', () => {
  localStorage.setItem(
    SCENE_KEY,
    JSON.stringify({
      notes: [{
        id: 'n-health',
        title: 'Health',
        body: 'Body',
        provenance: {
          origin: 'imported',
          createdAt: 100,
          updatedAt: 100,
          externalReferences: [{
            id: 'ref-1',
            kind: 'url',
            label: 'Broken ref',
            value: 'https://example.com',
            confidence: 0.9,
            isInferred: false,
            accessStatus: 'missing',
            identityStatus: 'unknown',
            meaningStatus: 'unknown',
            createdAt: 100
          }]
        },
        verificationState: 'needs-review',
        verificationReason: 'Source missing'
      }],
      relationships: [],
      projects: [],
      workspaces: []
    })
  );

  const loaded = loadScene();
  assert.equal(loaded.notes[0].verificationState, 'needs-review');
  assert.equal(loaded.notes[0].provenance?.externalReferences[0].sourceHealth, 'orphaned');
  saveScene(loaded as SceneState);
  const persisted = JSON.parse(localStorage.getItem(SCENE_KEY) as string) as SceneState;
  assert.equal(persisted.notes[0].verificationState, 'needs-review');
  assert.equal(persisted.notes[0].provenance?.externalReferences[0].sourceHealth, 'orphaned');
});


test('sceneStorage mirrors onboarding/study artifacts into durable study persistence backend', () => {
  const loaded = loadScene();
  const scene: SceneState = {
    ...loaded,
    onboardingProfile: {
      ageRange: 'college_adult_learner',
      primaryUseCase: 'studying_school',
      selectedPresetId: 'study_starter',
      starterLenses: ['study'],
      activeLensId: 'study',
      configuredAt: 123
    },
    studySupportBlocks: {
      'n-1': []
    },
    studyInteractions: {
      'n-1': []
    }
  };

  saveScene(scene);
  const persisted = JSON.parse(localStorage.getItem(STUDY_PERSISTENCE_KEY) as string) as Record<string, unknown>;
  assert.equal(Boolean(persisted['local-user']), true);
});


test('sceneStorage round-trips durable study data and applies recency precedence over stale scene data', () => {
  localStorage.setItem(STUDY_PERSISTENCE_KEY, JSON.stringify({
    'local-user': {
      onboardingProfile: {
        ageRange: 'college_adult_learner',
        primaryUseCase: 'studying_school',
        selectedPresetId: 'study_starter',
        starterLenses: ['study'],
        activeLensId: 'study',
        configuredAt: 500
      },
      blocksByNoteId: {
        'note-1': [{
          id: 'block-new',
          noteId: 'note-1',
          interactionType: 'key_ideas',
          title: 'Key ideas',
          label: 'AI study support',
          createdAt: 500,
          sourceNoteUpdatedAt: 1,
          generatedFrom: 'note-content',
          content: { kind: 'key_ideas', ideas: ['durable'] },
          provenance: {
            generator: 'heuristic',
            modelId: 'm',
            generatedAt: 500,
            explanation: 'durable source',
            citations: []
          }
        }]
      },
      interactionsByNoteId: {
        'note-1': [{ id: 'i-new', noteId: 'note-1', interactionType: 'quiz', createdAt: 500 }]
      }
    }
  }));

  localStorage.setItem(SCENE_KEY, JSON.stringify({
    notes: [{ id: 'note-1', title: 'N1', body: 'Body text long enough for note. Body text long enough for note.' }],
    relationships: [],
    projects: [],
    workspaces: [],
    onboardingProfile: {
      ageRange: 'working_adult',
      primaryUseCase: 'work_projects',
      selectedPresetId: 'work_starter',
      starterLenses: ['work'],
      activeLensId: 'work',
      configuredAt: 100
    },
    studySupportBlocks: {
      'note-1': [{
        id: 'block-old',
        noteId: 'note-1',
        interactionType: 'key_ideas',
        title: 'Key ideas',
        label: 'AI study support',
        createdAt: 100,
        sourceNoteUpdatedAt: 1,
        generatedFrom: 'note-content',
        content: { kind: 'key_ideas', ideas: ['scene'] },
        provenance: {
          generator: 'heuristic',
          modelId: 'm',
          generatedAt: 100,
          explanation: 'scene source',
          citations: []
        }
      }]
    },
    studyInteractions: {
      'note-1': [{ id: 'i-old', noteId: 'note-1', interactionType: 'quiz', createdAt: 100 }]
    }
  }));

  const loaded = loadScene();
  assert.equal(loaded.onboardingProfile?.configuredAt, 500);
  assert.equal(loaded.studySupportBlocks?.['note-1']?.[0]?.id, 'block-new');
  assert.equal(loaded.studyInteractions?.['note-1']?.[0]?.id, 'i-new');

  saveScene(loaded as SceneState);
  const persistedDurable = JSON.parse(localStorage.getItem(STUDY_PERSISTENCE_KEY) as string) as Record<string, any>;
  assert.equal(persistedDurable['local-user'].onboardingProfile.configuredAt, 500);
  assert.equal(persistedDurable['local-user'].blocksByNoteId['note-1'][0].id, 'block-new');
});
