import type {
  ExtensionDiffHunk,
  ExtensionFileSide,
  ExtensionFileViewSourceRange,
} from 'hunkdiff/extension';

const SIDES = ['old', 'new'] as const satisfies readonly ExtensionFileSide[];

export type SourceLineCounts = Readonly<
  Partial<Record<ExtensionFileSide, number>>
>;

/**
 * Binding the folded row makes it a stop for `j` and `k`. Hunk names that stop
 * after the first range, so the hunks come first. Binding every line of the
 * file lets each note show under the row, also a note whose lines moved in a
 * reload; an unbound note makes Hunk show the raw diff instead. Hunk allows
 * ranges in one row to overlap. A side without a line count, such as the commit
 * pointer of a submodule, stays unbound. Spans that cover no lines, like `[0,
 * 0]` for the missing side of a new file, are left out.
 */
const collectSourceRanges = (
  hunks: readonly ExtensionDiffHunk[],
  lineCounts: SourceLineCounts,
): ExtensionFileViewSourceRange[] => {
  const hunkRanges = hunks.flatMap((hunk) =>
    SIDES.flatMap((side) => {
      const range = side === 'old' ? hunk.oldRange : hunk.newRange;
      if (
        !range ||
        lineCounts[side] === undefined ||
        range[0] < 1 ||
        range[0] > range[1]
      ) {
        return [];
      }
      return [{ side, range: [range[0], range[1]] as const }];
    }),
  );
  const fileRanges = SIDES.flatMap((side) => {
    const lineCount = lineCounts[side];
    return lineCount === undefined || lineCount < 1
      ? []
      : [{ side, range: [1, lineCount] as const }];
  });
  return [...hunkRanges, ...fileRanges];
};

export default collectSourceRanges;
