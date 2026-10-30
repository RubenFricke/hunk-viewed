import type { ExtensionDiffFile } from 'hunkdiff/extension';

type File = Pick<ExtensionDiffFile, 'id'>;

interface FindNextUnviewedHunkOptions<F extends File> {
  readonly files: readonly F[];
  readonly fromFileId: string;
  readonly fromHunkIndex: number;
  readonly isViewed: (file: F) => boolean;
  readonly hunkCount: (file: F) => number;
  readonly isHunkViewed: (file: F, index: number) => boolean;
}

/** A stop for the next press: a hunk, or a whole file when it has no hunks. */
interface HunkStop<F extends File> {
  readonly file: F;
  readonly hunkIndex: number | null;
}

/**
 * Searches the hunks after the given one in its file, then every later file,
 * then from the start of the review, and last the hunks before the given one. A
 * file without hunks, such as a binary one, is one stop.
 */
const findNextUnviewedHunk = <F extends File>({
  files,
  fromFileId,
  fromHunkIndex,
  isViewed,
  hunkCount,
  isHunkViewed,
}: FindNextUnviewedHunkOptions<F>): HunkStop<F> | null => {
  const firstUnviewedHunk = (
    file: F,
    from: number,
    to: number,
  ): HunkStop<F> | null => {
    for (let index = from; index < to; index += 1) {
      if (!isHunkViewed(file, index)) {
        return { file, hunkIndex: index };
      }
    }
    return null;
  };

  const start = files.findIndex((file) => file.id === fromFileId);
  const origin = files[start];
  if (origin) {
    const stop = firstUnviewedHunk(
      origin,
      fromHunkIndex + 1,
      hunkCount(origin),
    );
    if (stop) {
      return stop;
    }
  }
  for (let step = 1; step < files.length; step += 1) {
    const file = files[(start + step + files.length) % files.length];
    if (!file || isViewed(file)) {
      continue;
    }
    const count = hunkCount(file);
    if (count === 0) {
      return { file, hunkIndex: null };
    }
    const stop = firstUnviewedHunk(file, 0, count);
    if (stop) {
      return stop;
    }
  }
  if (origin && !isViewed(origin)) {
    return firstUnviewedHunk(origin, 0, fromHunkIndex);
  }
  return null;
};

export default findNextUnviewedHunk;
