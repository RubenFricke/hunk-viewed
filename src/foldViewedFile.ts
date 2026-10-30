import type {
  ExtensionCommandControls,
  ExtensionDiffFile,
  ExtensionFileViewControls,
  ExtensionStatusLineControls,
} from 'hunkdiff/extension';

import { VIEWED_VIEW_ID } from './createViewedFileView.ts';
import type { ViewedProgress, ViewedStore } from './createViewedStore.ts';
import showProgress from './showProgress.ts';

const APPLY_TO_ALL_MATCHING = 'hunk.view.applyFilePresentationToAllMatching';

export interface FoldContext {
  readonly fileViews: Pick<
    ExtensionFileViewControls,
    'select' | 'refresh' | 'isActive'
  >;
  readonly statusLine: ExtensionStatusLineControls;
  readonly commands: Pick<ExtensionCommandControls, 'isEnabled' | 'execute'>;
}

interface FoldDependencies {
  readonly store: Pick<ViewedStore, 'mark' | 'progress'>;
  readonly announce: () => void;
  readonly waitForHunk: () => Promise<void>;
}

/**
 * The store is the only record of what is viewed. Every mark folds the selected
 * file and then has Hunk fold every other viewed file as well, which brings
 * back the folds that a reload dropped by giving files new ids.
 */
const foldViewedFile = async (
  ctx: FoldContext,
  file: Pick<ExtensionDiffFile, 'id' | 'path' | 'patch'>,
  { store, announce, waitForHunk }: FoldDependencies,
): Promise<ViewedProgress> => {
  store.mark(file);
  /**
   * After a reload dropped the mark, Hunk still holds the view for this file
   * with nothing to show, so selecting it again would change nothing; then it
   * has to lay the file out again. Otherwise selecting the view is enough.
   */
  if (ctx.fileViews.isActive(VIEWED_VIEW_ID)) {
    ctx.fileViews.refresh(VIEWED_VIEW_ID, { fileId: file.id });
  } else {
    ctx.fileViews.select(VIEWED_VIEW_ID);
  }
  const progress = store.progress();
  showProgress(ctx.statusLine, progress);
  announce();

  /**
   * Hunk enables the command once it has drawn the selected file in the folded
   * view and some other file the view matches is not folded.
   */
  await waitForHunk();
  if (ctx.commands.isEnabled(APPLY_TO_ALL_MATCHING)) {
    ctx.commands.execute(APPLY_TO_ALL_MATCHING);
  }
  return progress;
};

export default foldViewedFile;
