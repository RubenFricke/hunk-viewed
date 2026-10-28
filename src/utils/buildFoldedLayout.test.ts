import { describe, expect, it } from 'vitest';

import buildFoldedLayout from './buildFoldedLayout.ts';

const VIEWED_SPANS = [
  { text: '✓ ', tone: 'added' },
  { text: 'Viewed', tone: 'muted' },
];
const RANGES = [{ side: 'new', range: [1, 5] }] as const;

describe('buildFoldedLayout', () => {
  it('folds a file without hunks to one unbound row', () => {
    expect(buildFoldedLayout(0, [])).toEqual({
      rows: [{ id: 'viewed', spans: VIEWED_SPANS }],
      hunkRows: [],
    });
  });

  it('binds the one row of a file with one hunk', () => {
    expect(buildFoldedLayout(1, RANGES)).toEqual({
      rows: [{ id: 'viewed', spans: VIEWED_SPANS, sourceRanges: RANGES }],
      hunkRows: [{ startRow: 0, endRow: 0 }],
    });
  });

  it('adds one empty row for the other hunks of a file with more hunks', () => {
    expect(buildFoldedLayout(3, RANGES)).toEqual({
      rows: [
        { id: 'viewed', spans: VIEWED_SPANS, sourceRanges: RANGES },
        { id: 'viewed-hunks', spans: [{ text: '' }] },
      ],
      hunkRows: [
        { startRow: 0, endRow: 0 },
        { startRow: 1, endRow: 1 },
        { startRow: 1, endRow: 1 },
      ],
    });
  });

  it('lets every hunk own one unbound row when no source is readable', () => {
    expect(buildFoldedLayout(2, [])).toEqual({
      rows: [{ id: 'viewed', spans: VIEWED_SPANS }],
      hunkRows: [
        { startRow: 0, endRow: 0 },
        { startRow: 0, endRow: 0 },
      ],
    });
  });
});
