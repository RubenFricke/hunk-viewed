/**
 * A count, not names: the changed files unfold, so the review already shows
 * which ones they are, and a notice has room for one line only.
 */
const describeChangedFiles = (count: number): string =>
  count === 1
    ? '1 file has changed since viewed'
    : `${String(count)} files have changed since viewed`;

export default describeChangedFiles;
