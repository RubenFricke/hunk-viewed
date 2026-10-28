import type {
  ExtensionDiffHunk,
  ExtensionFileSide,
  ExtensionFileViewSourceRange,
} from 'hunkdiff/extension';

const SIDES = ['old', 'new'] as const satisfies readonly ExtensionFileSide[];

/**
 * Lists the source lines of every hunk, on the sides that Hunk can read.
 *
 * @remarks
 *   Binding the folded row to these lines makes it a stop for `j` and `k`, and
 *   lets a note anywhere in the file show under it instead of unfolding the
 *   file. Hunk reads every bound side to check the lines, so a side it cannot
 *   read, such as the commit pointer of a submodule, must stay unbound. A side
 *   that the file does not have, as in a new file, has a span like `[0, 0]` and
 *   is left out too.
 * @param hunks - The parsed hunks of the file.
 * @param readableSides - The sides whose source Hunk can read.
 * @returns One range per hunk and readable side.
 */
const collectSourceRanges = (
  hunks: readonly ExtensionDiffHunk[],
  readableSides: ReadonlySet<ExtensionFileSide>,
): ExtensionFileViewSourceRange[] =>
  hunks.flatMap((hunk) =>
    SIDES.flatMap((side) => {
      const range = side === 'old' ? hunk.oldRange : hunk.newRange;
      if (
        !range ||
        !readableSides.has(side) ||
        range[0] < 1 ||
        range[0] > range[1]
      ) {
        return [];
      }
      return [{ side, range: [range[0], range[1]] as const }];
    }),
  );

export default collectSourceRanges;
