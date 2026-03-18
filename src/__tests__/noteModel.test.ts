import test from 'node:test';
import assert from 'node:assert/strict';
import { createNote, inferNoteTitleAndBody, normalizeNote } from '../notes/noteModel';

test('createNote infers title/body and preserves project/workspace affinity', (t: any) => {
  t.mock.method(Date, 'now', () => 1_700_000_000_000);
  t.mock.method(globalThis.crypto, 'randomUUID', () => 'note-1');
  const note = createNote('  hello world\nBody line  ', 10, ['proj-1'], 'ws-1');
  assert.deepEqual(note.title, 'hello world');
  assert.deepEqual(note.body, 'Body line');
  assert.deepEqual(note.projectIds, ['proj-1']);
  assert.equal(note.workspaceId, 'ws-1');
});

test('inferNoteTitleAndBody uses first non-empty line as title', () => {
  assert.deepEqual(inferNoteTitleAndBody('\n\nTitle\nBody\nMore'), { title: 'Title', body: 'Body\nMore' });
});

test('normalizeNote preserves contract defaults and coercions', (t: any) => {
  t.mock.method(Date, 'now', () => 1234);
  const normalized = normalizeNote({ id: 99 as unknown as string, title: '   ', body: null as unknown as string, anchors: [1, 'x'] as unknown as string[], trace: undefined, x: '8' as unknown as number, y: undefined, z: undefined, archived: 0 as unknown as boolean, projectIds: ['proj-1', 'proj-1', 9] as unknown as string[], workspaceId: 'ws-1', isFocus: true }, 4);
  assert.deepEqual(normalized.id, '99');
  assert.equal(normalized.isFocus, true);
  assert.deepEqual(normalized.projectIds, ['proj-1', '9']);
  assert.equal(normalized.workspaceId, 'ws-1');
});
