import type {
  ExtensionFileViewLayout,
  ExtensionFileViewRow,
  ExtensionFileViewSourceRange,
  ExtensionFileViewSpan,
} from 'hunkdiff/extension';

const VIEWED_SPANS = [
  { text: '✓ ', tone: 'added' },
  { text: 'Viewed', tone: 'muted' },
] as const satisfies readonly ExtensionFileViewSpan[];

/**
 * Builds the folded presentation of a viewed file: Hunk's own file header, then
 * one `✓ Viewed` row.
 *
 * @remarks
 *   Hunk needs one row range for every hunk. A row with source ranges must belong
 *   to exactly one hunk, so with source ranges the first hunk owns the `✓
 *   Viewed` row and the others share one empty row below it. A row is at least
 *   one line high, so that empty row stays visible. Without source ranges every
 *   hunk owns the `✓ Viewed` row.
 * @param hunkCount - The number of parsed hunks in the file.
 * @param sourceRanges - The source lines to bind the `✓ Viewed` row to.
 * @returns The layout for Hunk.
 */
const buildFoldedLayout = (
  hunkCount: number,
  sourceRanges: readonly ExtensionFileViewSourceRange[],
): ExtensionFileViewLayout => {
  if (sourceRanges.length === 0) {
    return {
      rows: [{ id: 'viewed', spans: VIEWED_SPANS }],
      hunkRows: Array.from({ length: hunkCount }, () => ({
        startRow: 0,
        endRow: 0,
      })),
    };
  }

  const rows: ExtensionFileViewRow[] = [
    { id: 'viewed', spans: VIEWED_SPANS, sourceRanges },
  ];
  if (hunkCount > 1) {
    rows.push({ id: 'viewed-hunks', spans: [{ text: '' }] });
  }
  return {
    rows,
    hunkRows: Array.from({ length: hunkCount }, (_, index) =>
      index === 0 ? { startRow: 0, endRow: 0 } : { startRow: 1, endRow: 1 },
    ),
  };
};

export default buildFoldedLayout;
