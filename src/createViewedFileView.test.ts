import type {
  ExtensionDiffFile,
  ExtensionFileSide,
  ExtensionFileViewInput,
} from 'hunkdiff/extension';
import { describe, expect, it } from 'vitest';

import createViewedFileView, {
  VIEWED_VIEW_ID,
} from './createViewedFileView.ts';
import fakeDiffFile from '../test/fakeDiffFile.ts';

const GUIDE = fakeDiffFile({
  path: 'docs/guide.md',
  hunks: [
    { index: 0, header: '@@ -1,5 +1,5 @@', oldRange: [1, 5], newRange: [1, 5] },
    {
      index: 1,
      header: '@@ -35,6 +35,6 @@',
      oldRange: [35, 40],
      newRange: [35, 40],
    },
  ],
});

const layoutInput = (
  file: ExtensionDiffFile,
  readable: readonly ExtensionFileSide[],
): { input: ExtensionFileViewInput; readSides: ExtensionFileSide[] } => {
  const readSides: ExtensionFileSide[] = [];
  return {
    readSides,
    input: {
      file,
      width: 120,
      signal: new AbortController().signal,
      changes: [],
      readDocument: (side) => {
        readSides.push(side);
        return Promise.resolve(
          readable.includes(side) ? 'line\n'.repeat(40) : null,
        );
      },
    },
  };
};

describe('createViewedFileView', () => {
  it('matches only viewed files', () => {
    const view = createViewedFileView({
      isViewed: (file) => file.path === GUIDE.path,
    });

    expect(view.id).toBe(VIEWED_VIEW_ID);
    expect(view.matches(GUIDE)).toBe(true);
    expect(view.matches(fakeDiffFile({ path: 'src/user.ts' }))).toBe(false);
  });

  it('returns no layout for a file that is no longer viewed', async () => {
    const view = createViewedFileView({ isViewed: () => false });

    expect(
      await view.layout(layoutInput(GUIDE, ['old', 'new']).input),
    ).toBeNull();
  });

  it('binds the folded row to the sides that Hunk can read', async () => {
    const view = createViewedFileView({ isViewed: () => true });

    expect(await view.layout(layoutInput(GUIDE, ['new']).input)).toMatchObject({
      rows: [
        {
          id: 'viewed',
          sourceRanges: [
            { side: 'new', range: [1, 5] },
            { side: 'new', range: [35, 40] },
            { side: 'new', range: [1, 40] },
          ],
        },
        { id: 'viewed-hunks' },
      ],
    });
  });

  it('leaves the folded row unbound when Hunk can read no source', async () => {
    const view = createViewedFileView({ isViewed: () => true });
    const layout = await view.layout(layoutInput(GUIDE, []).input);

    expect(layout?.rows).toHaveLength(1);
    expect(layout?.rows[0]?.sourceRanges).toBeUndefined();
  });

  it('reads no source for a file without hunks', async () => {
    const view = createViewedFileView({ isViewed: () => true });
    const { input, readSides } = layoutInput(
      fakeDiffFile({ path: 'logo.bin', isBinary: true }),
      ['old', 'new'],
    );

    expect(await view.layout(input)).toMatchObject({ hunkRows: [] });
    expect(readSides).toEqual([]);
  });
});
