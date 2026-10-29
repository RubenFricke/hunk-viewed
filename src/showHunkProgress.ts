import type { ExtensionStatusLineControls } from 'hunkdiff/extension';

import type { ViewedProgress } from './createViewedStore.ts';

const HUNKS_ITEM_ID = 'hunks';

/**
 * Only a file with some hunks viewed and some not gets a count: with none,
 * there is nothing to say, and with all, the file folds. The item is the first
 * to go when the status line runs out of room.
 */
const showHunkProgress = (
  statusLine: ExtensionStatusLineControls,
  progress: ViewedProgress | null,
): void => {
  if (
    !progress ||
    progress.viewed === 0 ||
    progress.viewed === progress.total
  ) {
    statusLine.clear(HUNKS_ITEM_ID);
    return;
  }
  statusLine.set({
    id: HUNKS_ITEM_ID,
    spans: [
      {
        text: `${progress.viewed} of ${progress.total} hunks viewed`,
        tone: 'accent',
      },
    ],
    alignment: 'left',
    priority: -1,
  });
};

export default showHunkProgress;
