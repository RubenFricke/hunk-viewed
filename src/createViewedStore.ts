import type { ExtensionDiffFile } from 'hunkdiff/extension';

import computeChangeKey from './utils/computeChangeKey.ts';

type ViewedFile = Pick<ExtensionDiffFile, 'id' | 'path' | 'patch'>;

export interface ViewedProgress {
  readonly viewed: number;
  readonly total: number;
}

export interface ViewedStore {
  readonly isViewed: (file: ViewedFile) => boolean;
  readonly mark: (file: ViewedFile) => void;
  readonly unmark: (file: ViewedFile) => void;
  /** Returns whether a mark was dropped. */
  readonly reconcile: (files: readonly ViewedFile[]) => boolean;
  readonly progress: () => ViewedProgress;
  readonly viewedFiles: () => readonly ViewedFile[];
}

/**
 * Nothing is written to disk, like Hunk's own review notes. Marks are keyed by
 * path, because Hunk renumbers file ids when a reload adds or drops a file. A
 * mark holds the change key of the patch it was set on, so it no longer counts
 * once the changes in the file differ.
 */
const createViewedStore = (): ViewedStore => {
  const changeKeysByPath = new Map<string, string>();
  let files: readonly ViewedFile[] = [];

  const isViewed = (file: ViewedFile): boolean => {
    const changeKey = changeKeysByPath.get(file.path);
    return (
      changeKey !== undefined && changeKey === computeChangeKey(file.patch)
    );
  };

  return {
    isViewed,
    mark: (file) => {
      changeKeysByPath.set(file.path, computeChangeKey(file.patch));
    },
    unmark: (file) => {
      changeKeysByPath.delete(file.path);
    },
    reconcile: (nextFiles) => {
      files = nextFiles;
      const filesByPath = new Map(nextFiles.map((file) => [file.path, file]));
      let hasDropped = false;
      for (const path of changeKeysByPath.keys()) {
        const file = filesByPath.get(path);
        if (!file || !isViewed(file)) {
          changeKeysByPath.delete(path);
          hasDropped = true;
        }
      }
      return hasDropped;
    },
    viewedFiles: () => files.filter(isViewed),
    progress: () => ({
      viewed: files.filter(isViewed).length,
      total: files.length,
    }),
  };
};

export default createViewedStore;
