import { describe, expect, it } from 'vitest';

import collectSourceRanges from './collectSourceRanges.ts';

const GUIDE_HUNKS = [
  { index: 0, header: '@@ -1,5 +1,5 @@', oldRange: [1, 5], newRange: [1, 5] },
  {
    index: 1,
    header: '@@ -35,6 +35,6 @@',
    oldRange: [35, 40],
    newRange: [35, 40],
  },
] satisfies Parameters<typeof collectSourceRanges>[0];

describe('collectSourceRanges', () => {
  it('lists the hunks first, then the whole file, on both readable sides', () => {
    expect(collectSourceRanges(GUIDE_HUNKS, { old: 40, new: 40 })).toEqual([
      { side: 'old', range: [1, 5] },
      { side: 'new', range: [1, 5] },
      { side: 'old', range: [35, 40] },
      { side: 'new', range: [35, 40] },
      { side: 'old', range: [1, 40] },
      { side: 'new', range: [1, 40] },
    ]);
  });

  it('leaves out a side that Hunk cannot read', () => {
    expect(collectSourceRanges(GUIDE_HUNKS, { new: 40 })).toEqual([
      { side: 'new', range: [1, 5] },
      { side: 'new', range: [35, 40] },
      { side: 'new', range: [1, 40] },
    ]);
    expect(collectSourceRanges(GUIDE_HUNKS, {})).toEqual([]);
  });

  it('leaves out spans that cover no lines, as for a new file', () => {
    const hunks = [
      {
        index: 0,
        header: '@@ -0,0 +1,31 @@',
        oldRange: [0, 0],
        newRange: [1, 31],
      },
    ] satisfies Parameters<typeof collectSourceRanges>[0];

    expect(collectSourceRanges(hunks, { old: 0, new: 31 })).toEqual([
      { side: 'new', range: [1, 31] },
      { side: 'new', range: [1, 31] },
    ]);
  });

  it('leaves out a hunk without line numbers', () => {
    expect(
      collectSourceRanges([{ index: 0, header: '@@' }], { new: 3 }),
    ).toEqual([{ side: 'new', range: [1, 3] }]);
  });
});
