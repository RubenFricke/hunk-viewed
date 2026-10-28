import type { ExtensionStatusLineControls } from 'hunkdiff/extension';

import type { ViewedProgress } from './createViewedStore.ts';

const PROGRESS_ITEM_ID = 'progress';

/**
 * Shows how many files of the review are viewed, at the right of Hunk's status
 * line.
 *
 * @remarks
 *   An empty review shows nothing, because a status item keeps the status line on
 *   screen.
 * @param statusLine - Hunk's status line controls.
 * @param progress - The viewed and total number of files.
 */
const showProgress = (
  statusLine: ExtensionStatusLineControls,
  progress: ViewedProgress,
): void => {
  if (progress.total === 0) {
    statusLine.clear(PROGRESS_ITEM_ID);
    return;
  }
  const noun = progress.total === 1 ? 'file' : 'files';
  statusLine.set({
    id: PROGRESS_ITEM_ID,
    spans: [
      {
        text: `${progress.viewed} of ${progress.total} ${noun} viewed`,
        tone: progress.viewed > 0 ? 'accent' : 'muted',
      },
    ],
    alignment: 'right',
  });
};

export default showProgress;
