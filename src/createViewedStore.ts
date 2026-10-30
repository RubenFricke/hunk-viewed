import type { ExtensionDiffFile } from 'hunkdiff/extension';

import computeChangeKey from './utils/computeChangeKey.ts';
import parseHunks, { type ParsedHunk } from './utils/parseHunks.ts';

export type ViewedFile = Pick<ExtensionDiffFile, 'id' | 'path' | 'patch'>;

export interface ViewedProgress {
  readonly viewed: number;
  readonly total: number;
}

/** The paths whose marks a reload dropped, by reason. */
interface DroppedMarks {
  /** Still in the review, but the changes in the file differ. */
  readonly changed: readonly string[];
  /** No longer in the review. */
  readonly removed: readonly string[];
}

export interface ViewedStore {
  readonly isViewed: (file: ViewedFile) => boolean;
  readonly mark: (file: ViewedFile) => void;
  readonly unmark: (file: ViewedFile) => void;
  readonly reconcile: (files: readonly ViewedFile[]) => DroppedMarks;
  readonly progress: () => ViewedProgress;
  readonly viewedFiles: () => readonly ViewedFile[];
  readonly fileById: (id: string) => ViewedFile | null;
  /** The hunks of a file, in the order Hunk indexes them. */
  readonly hunksOf: (file: ViewedFile) => readonly ParsedHunk[];
  /** True for every hunk of a viewed file. */
  readonly isHunkViewed: (file: ViewedFile, index: number) => boolean;
  readonly markHunk: (file: ViewedFile, index: number) => void;
  readonly unmarkHunk: (file: ViewedFile, index: number) => void;
  readonly clearHunks: (file: ViewedFile) => void;
  readonly hunkProgress: (file: ViewedFile) => ViewedProgress;
}

/**
 * Nothing is written to disk, like Hunk's own review notes. Marks are keyed by
 * path, because Hunk renumbers file ids when a reload adds or drops a file. A
 * mark holds the change key of the patch it was set on, so it no longer counts
 * once the changes in the file differ. A hunk mark works the same way with the
 * key of one hunk.
 */
const createViewedStore = (): ViewedStore => {
  const changeKeysByPath = new Map<string, string>();
  const hunkKeysByPath = new Map<string, Set<string>>();
  const parsedByPath = new Map<
    string,
    { patch: string; hunks: readonly ParsedHunk[] }
  >();
  let files: readonly ViewedFile[] = [];

  const isViewed = (file: ViewedFile): boolean => {
    const changeKey = changeKeysByPath.get(file.path);
    return (
      changeKey !== undefined && changeKey === computeChangeKey(file.patch)
    );
  };
  /** A patch is hashed once per load, not on every key press. */
  const hunksOf = (file: ViewedFile): readonly ParsedHunk[] => {
    const cached = parsedByPath.get(file.path);
    if (cached?.patch === file.patch) {
      return cached.hunks;
    }
    const hunks = parseHunks(file.patch);
    parsedByPath.set(file.path, { patch: file.patch, hunks });
    return hunks;
  };
  const hunkKey = (file: ViewedFile, index: number): string | undefined =>
    hunksOf(file)[index]?.key;
  const isHunkViewed = (file: ViewedFile, index: number): boolean => {
    if (isViewed(file)) {
      return true;
    }
    const key = hunkKey(file, index);
    return (
      key !== undefined && (hunkKeysByPath.get(file.path)?.has(key) ?? false)
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
      const changed: string[] = [];
      const removed: string[] = [];
      for (const path of changeKeysByPath.keys()) {
        const file = filesByPath.get(path);
        if (!file) {
          removed.push(path);
        } else if (!isViewed(file)) {
          changed.push(path);
        }
      }
      for (const path of [...changed, ...removed]) {
        changeKeysByPath.delete(path);
      }
      for (const [path, keys] of hunkKeysByPath) {
        const file = filesByPath.get(path);
        if (!file) {
          hunkKeysByPath.delete(path);
          continue;
        }
        const current = new Set(hunksOf(file).map((hunk) => hunk.key));
        for (const key of keys) {
          if (!current.has(key)) {
            keys.delete(key);
          }
        }
      }
      return { changed, removed };
    },
    viewedFiles: () => files.filter(isViewed),
    progress: () => ({
      viewed: files.filter(isViewed).length,
      total: files.length,
    }),
    fileById: (id) => files.find((file) => file.id === id) ?? null,
    hunksOf,
    isHunkViewed,
    markHunk: (file, index) => {
      const key = hunkKey(file, index);
      if (key === undefined) {
        return;
      }
      let keys = hunkKeysByPath.get(file.path);
      if (!keys) {
        keys = new Set();
        hunkKeysByPath.set(file.path, keys);
      }
      keys.add(key);
    },
    unmarkHunk: (file, index) => {
      const key = hunkKey(file, index);
      if (key !== undefined) {
        hunkKeysByPath.get(file.path)?.delete(key);
      }
    },
    clearHunks: (file) => {
      hunkKeysByPath.delete(file.path);
    },
    hunkProgress: (file) => {
      const hunks = hunksOf(file);
      return {
        viewed: hunks.filter((_, index) => isHunkViewed(file, index)).length,
        total: hunks.length,
      };
    },
  };
};

export default createViewedStore;
