import { describe, expect, it } from 'vitest';

import findNextUnviewedHunk from './findNextUnviewedHunk.ts';

interface File {
  readonly id: string;
  readonly hunks: number;
}

const A = { id: 'a', hunks: 3 };
const B = { id: 'b', hunks: 0 };
const C = { id: 'c', hunks: 2 };
const FILES: readonly File[] = [A, B, C];

const search = ({
  fromFileId,
  fromHunkIndex,
  viewedFiles = [],
  viewedHunks = [],
}: {
  fromFileId: string;
  fromHunkIndex: number;
  viewedFiles?: readonly string[];
  viewedHunks?: readonly string[];
}) =>
  findNextUnviewedHunk({
    files: FILES,
    fromFileId,
    fromHunkIndex,
    isViewed: (file) => viewedFiles.includes(file.id),
    hunkCount: (file) => file.hunks,
    isHunkViewed: (file, index) =>
      viewedFiles.includes(file.id) ||
      viewedHunks.includes(`${file.id}:${String(index)}`),
  });

describe('findNextUnviewedHunk', () => {
  it('finds the next hunk in the same file first', () => {
    expect(search({ fromFileId: 'a', fromHunkIndex: 0 })).toEqual({
      file: A,
      hunkIndex: 1,
    });
  });

  it('skips viewed hunks', () => {
    expect(
      search({ fromFileId: 'a', fromHunkIndex: 0, viewedHunks: ['a:1'] }),
    ).toEqual({ file: A, hunkIndex: 2 });
  });

  it('stops on a file without hunks as a whole', () => {
    expect(search({ fromFileId: 'a', fromHunkIndex: 2 })).toEqual({
      file: B,
      hunkIndex: null,
    });
  });

  it('skips viewed files and lands on the first unviewed hunk of the next', () => {
    expect(
      search({
        fromFileId: 'a',
        fromHunkIndex: 2,
        viewedFiles: ['b'],
        viewedHunks: ['c:0'],
      }),
    ).toEqual({ file: C, hunkIndex: 1 });
  });

  it('wraps to the start of the review', () => {
    expect(
      search({ fromFileId: 'c', fromHunkIndex: 1, viewedFiles: ['b'] }),
    ).toEqual({ file: A, hunkIndex: 0 });
  });

  it('comes back to the hunks before the given one last', () => {
    expect(
      search({
        fromFileId: 'a',
        fromHunkIndex: 2,
        viewedFiles: ['b', 'c'],
        viewedHunks: ['a:0'],
      }),
    ).toEqual({ file: A, hunkIndex: 1 });
  });

  it('finds nothing when every hunk is viewed', () => {
    expect(
      search({
        fromFileId: 'a',
        fromHunkIndex: 2,
        viewedFiles: ['b', 'c'],
        viewedHunks: ['a:0', 'a:1'],
      }),
    ).toBeNull();
  });
});
