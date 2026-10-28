import type { ExtensionDiffFile } from 'hunkdiff/extension';

type FoldedFile = Pick<ExtensionDiffFile, 'id' | 'path'>;

export interface FoldTracker {
  readonly folded: (file: FoldedFile) => void;
  readonly unfolded: (file: Pick<ExtensionDiffFile, 'path'>) => void;
  readonly reconcile: (viewedFiles: readonly FoldedFile[]) => void;
  readonly needsRefold: () => boolean;
  readonly refolded: (viewedFiles: readonly FoldedFile[]) => void;
}

/**
 * Hunk keeps the presentation of a file by its id, and a reload that adds or
 * drops a file gives the files after it new ids. So a viewed file whose id
 * changed is unfolded again, and only then does refolding have work to do.
 */
const createFoldTracker = (): FoldTracker => {
  const foldedIdsByPath = new Map<string, string>();
  let hasLostFolds = false;

  return {
    folded: (file) => {
      foldedIdsByPath.set(file.path, file.id);
    },
    unfolded: (file) => {
      foldedIdsByPath.delete(file.path);
    },
    reconcile: (viewedFiles) => {
      const idsByPath = new Map(
        viewedFiles.map((file) => [file.path, file.id]),
      );
      for (const [path, foldedId] of foldedIdsByPath) {
        const id = idsByPath.get(path);
        if (id === undefined) {
          foldedIdsByPath.delete(path);
        } else if (id !== foldedId) {
          hasLostFolds = true;
        }
      }
    },
    needsRefold: () => hasLostFolds,
    refolded: (viewedFiles) => {
      foldedIdsByPath.clear();
      for (const file of viewedFiles) {
        foldedIdsByPath.set(file.path, file.id);
      }
      hasLostFolds = false;
    },
  };
};

export default createFoldTracker;
