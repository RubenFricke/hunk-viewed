/**
 * Counts like Hunk checks source ranges: no line after a trailing newline, and
 * none in an empty document. A range past the last line makes Hunk show the raw
 * diff instead of the folded view.
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
