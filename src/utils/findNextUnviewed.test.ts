import { describe, expect, it } from 'vitest';

import findNextUnviewed from './findNextUnviewed.ts';

const FILES = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];

describe('findNextUnviewed', () => {
  it('finds the next unviewed file after the given file', () => {
    const viewed = new Set(['c']);

    expect(
      findNextUnviewed({
        files: FILES,
        fromFileId: 'b',
        isViewed: (file) => viewed.has(file.id),
      }),
    ).toEqual({ id: 'd' });
  });

  it('continues from the start after the last file', () => {
    const viewed = new Set(['a', 'd']);

    expect(
      findNextUnviewed({
        files: FILES,
        fromFileId: 'd',
        isViewed: (file) => viewed.has(file.id),
      }),
    ).toEqual({ id: 'b' });
  });

  it('never returns the given file itself', () => {
    expect(
      findNextUnviewed({
        files: FILES,
        fromFileId: 'b',
        isViewed: (file) => file.id !== 'b',
      }),
    ).toBeNull();
  });

  it('starts at the first file when the given file is not in the list', () => {
    expect(
      findNextUnviewed({
        files: FILES,
        fromFileId: 'hidden',
        isViewed: () => false,
      }),
    ).toEqual({ id: 'a' });
  });

  it('finds nothing in an empty review', () => {
    expect(
      findNextUnviewed({
        files: [],
        fromFileId: 'a',
        isViewed: () => false,
      }),
    ).toBeNull();
  });
});
