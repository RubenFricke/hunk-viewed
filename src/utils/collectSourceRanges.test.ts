import { describe, expect, it } from 'vitest';

import collectSourceRanges from './collectSourceRanges.ts';

const BOTH_SIDES = new Set(['old', 'new'] as const);

describe('collectSourceRanges', () => {
  it('lists both sides of every hunk when Hunk can read both', () => {
    const hunks = [
      {
        index: 0,
        header: '@@ -1,5 +1,5 @@',
        oldRange: [1, 5],
        newRange: [1, 5],
      },
      {
        index: 1,
        header: '@@ -35,6 +35,6 @@',
        oldRange: [35, 40],
        newRange: [35, 40],
      },
    ] satisfies Parameters<typeof collectSourceRanges>[0];

    expect(collectSourceRanges(hunks, BOTH_SIDES)).toEqual([
      { side: 'old', range: [1, 5] },
      { side: 'new', range: [1, 5] },
      { side: 'old', range: [35, 40] },
      { side: 'new', range: [35, 40] },
    ]);
  });

  it('leaves out a side that Hunk cannot read', () => {
    const hunks = [
      { index: 0, header: '@@ -1 +1 @@', oldRange: [1, 1], newRange: [1, 1] },
    ] satisfies Parameters<typeof collectSourceRanges>[0];

    expect(collectSourceRanges(hunks, new Set(['new'] as const))).toEqual([
      { side: 'new', range: [1, 1] },
    ]);
    expect(collectSourceRanges(hunks, new Set())).toEqual([]);
  });

  it('leaves out a span that covers no lines, as for a new file', () => {
    const hunks = [
      {
        index: 0,
        header: '@@ -0,0 +1,31 @@',
        oldRange: [0, 0],
        newRange: [1, 31],
      },
      {
        index: 1,
        header: '@@ -9,0 +9,0 @@',
        oldRange: [9, 8],
        newRange: [9, 8],
      },
    ] satisfies Parameters<typeof collectSourceRanges>[0];

    expect(collectSourceRanges(hunks, BOTH_SIDES)).toEqual([
      { side: 'new', range: [1, 31] },
    ]);
  });

  it('leaves out a hunk without line numbers', () => {
    expect(
      collectSourceRanges([{ index: 0, header: '@@' }], BOTH_SIDES),
    ).toEqual([]);
  });
});
