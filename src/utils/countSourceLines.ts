/**
 * Counts the lines of a source document the way Hunk checks source ranges.
 *
 * @remarks
 *   Hunk does not count a line after a trailing newline, and an empty document
 *   has no lines. A range that ends after the last line makes Hunk show the raw
 *   diff instead of the folded view.
 * @param source - The full text of one side of a file.
 * @returns The number of lines.
 */
const countSourceLines = (source: string): number => {
  if (source.length === 0) {
    return 0;
  }
  const withoutTerminator = source.endsWith('\n')
    ? source.slice(0, -1)
    : source;
  return withoutTerminator.split('\n').length;
};

export default countSourceLines;
