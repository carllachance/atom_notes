import { describe, expect, it, vi } from 'vitest';
import { createNote, normalizeNote } from '../notes/noteModel';

describe('noteModel', () => {
  it('createNote applies defaults and trims body', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue('note-1');

    const note = createNote('  hello world  ', 10);

    expect(note).toEqual({
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
      inFocus: false
    });
  });

  it('normalizeNote preserves contract defaults and coercions', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1234);

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
        archived: 0 as unknown as boolean
      },
      4
    );

    expect(normalized).toEqual({
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
      inFocus: false
    });
  });
});
