import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createNote, normalizeNote } from '../notes/noteModel';

describe('noteModel', () => {
  it('createNote applies defaults and trims body', () => {
    const originalNow = Date.now;
    const originalUuid = globalThis.crypto.randomUUID;
    Date.now = () => 1_700_000_000_000;
    globalThis.crypto.randomUUID = (() => 'note-1') as unknown as typeof globalThis.crypto.randomUUID;

    try {
      const note = createNote('  hello world  ', 10);

      assert.deepEqual(note, {
        id: 'note-1',
        title: null,
        body: 'hello world',
        anchors: [],
        trace: 'captured',
        x: 80 + (10 % 8) * 32,
        y: 100 + (10 % 6) * 28,
        z: 10,
        createdAt: 1_700_000_000_000,
        updatedAt: 1_700_000_000_000,
        archived: false,
        inFocus: false,
        workspaceId: null,
        workspaceAffinities: [],
        projectIds: []
      });
    } finally {
      Date.now = originalNow;
      globalThis.crypto.randomUUID = originalUuid;
    }
  });

  it('normalizeNote preserves contract defaults and coercions', () => {
    const originalNow = Date.now;
    Date.now = () => 1234;

    try {
      const normalized = normalizeNote(
        {
          id: 99 as unknown as string,
          title: '   ',
          body: null as unknown as string,
          anchors: [1, 'x'] as unknown as string[],
          trace: undefined,
          x: '8' as unknown as number,
          y: undefined,
          z: undefined,
          archived: 0 as unknown as boolean,
          workspace: ' research ',
          workspaceAffinities: ['research', 'ops', 'ops'],
          projects: ['atlas', '']
        },
        4
      );

      assert.deepEqual(normalized, {
        id: '99',
        title: null,
        body: '',
        anchors: ['1', 'x'],
        trace: 'idle',
        x: 8,
        y: 100,
        z: 5,
        createdAt: 1234,
        updatedAt: 1234,
        archived: false,
        inFocus: false,
        workspaceId: 'research',
        workspaceAffinities: ['research', 'ops'],
        projectIds: ['atlas']
      });
    } finally {
      Date.now = originalNow;
    }
  });
});
