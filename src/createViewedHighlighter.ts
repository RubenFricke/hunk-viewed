import type {
  ExtensionLineHighlight,
  ExtensionLineHighlighter,
} from 'hunkdiff/extension';

import type { ViewedStore } from './createViewedStore.ts';

/** `ctx.highlights.refresh` takes this id after a hunk mark changes. */
export const VIEWED_HUNKS_HIGHLIGHTER_ID = 'viewed-hunks';

/**
 * A viewed hunk is dimmed: Hunk recedes its text toward the background and
 * keeps the diff colors. A file view cannot fold one hunk, only a whole file,
 * so this is what marks a hunk until the file folds.
 */
const createViewedHighlighter = (
  store: Pick<ViewedStore, 'hunksOf' | 'isHunkViewed' | 'isViewed'>,
): ExtensionLineHighlighter => ({
  id: VIEWED_HUNKS_HIGHLIGHTER_ID,
  highlight: ({ file }) => {
    /** A viewed file is folded; its hunks are not drawn. */
    if (store.isViewed(file)) {
      return null;
    }
    const marks: ExtensionLineHighlight[] = [];
    store.hunksOf(file).forEach((hunk, index) => {
      if (!store.isHunkViewed(file, index)) {
        return;
      }
      for (const { side, line, length } of hunk.lines) {
        if (length > 0) {
          marks.push({ side, line, range: [0, length], tone: 'dim' });
        }
      }
    });
    return marks.length > 0 ? marks : null;
  },
});

export default createViewedHighlighter;
