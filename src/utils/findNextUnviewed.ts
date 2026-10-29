import type { ExtensionDiffFile } from 'hunkdiff/extension';

interface FindNextUnviewedOptions<File> {
  readonly files: readonly File[];
  readonly fromFileId: string;
  readonly isViewed: (file: File) => boolean;
}

/**
 * Searches after the given file first, then from the start of the review, so
 * pressing `x` alone walks through every file that is still unviewed.
 */
const findNextUnviewed = <File extends Pick<ExtensionDiffFile, 'id'>>({
  files,
  fromFileId,
  isViewed,
}: FindNextUnviewedOptions<File>): File | null => {
  const start = files.findIndex((file) => file.id === fromFileId);
  for (let step = 1; step <= files.length; step += 1) {
    const file = files[(start + step) % files.length];
    if (file && file.id !== fromFileId && !isViewed(file)) {
      return file;
    }
  }
  return null;
};

export default findNextUnviewed;
