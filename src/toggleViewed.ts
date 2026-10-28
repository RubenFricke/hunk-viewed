import type {
  ExtensionCommand,
  ExtensionCommandControls,
  ExtensionContext,
  ExtensionFileViewControls,
  ExtensionReviewNavigation,
  ExtensionReviewSelection,
  ExtensionStatusLineControls,
} from 'hunkdiff/extension';

import type { FoldTracker } from './createFoldTracker.ts';
import { VIEWED_VIEW_ID } from './createViewedFileView.ts';
import type { ViewedStore } from './createViewedStore.ts';
import showProgress from './showProgress.ts';
import findNextUnviewed from './utils/findNextUnviewed.ts';
import waitFor from './utils/waitFor.ts';

const APPLY_TO_ALL_MATCHING = 'hunk.view.applyFilePresentationToAllMatching';

/** Users remap the key by this id, so the id must not change. */
export const TOGGLE_VIEWED_COMMAND = {
  id: 'toggleViewed',
  title: 'Toggle viewed on the selected file',
  key: 'x',
} as const satisfies ExtensionCommand;

interface ToggleViewedContext extends Pick<ExtensionContext, 'notify'> {
  readonly selection: Pick<ExtensionReviewSelection, 'file' | 'files'>;
  readonly fileViews: Pick<ExtensionFileViewControls, 'select'>;
  readonly navigation: Pick<ExtensionReviewNavigation, 'selectFile'>;
  readonly statusLine: ExtensionStatusLineControls;
  readonly commands: Pick<ExtensionCommandControls, 'isEnabled' | 'execute'>;
}

interface ToggleViewedDependencies {
  readonly store: ViewedStore;
  readonly folds: FoldTracker;
  readonly waitUntil?: (check: () => boolean) => Promise<boolean>;
}

/** The mark comes before the view: the folded view only matches viewed files. */
const toggleViewed = async (
  ctx: ToggleViewedContext,
  { store, folds, waitUntil = waitFor }: ToggleViewedDependencies,
): Promise<void> => {
  const { file } = ctx.selection;
  if (!file) {
    ctx.notify('Select a file to mark it viewed', 'info');
    return;
  }

  if (store.isViewed(file)) {
    store.unmark(file);
    ctx.fileViews.select(null);
    folds.unfolded(file);
    showProgress(ctx.statusLine, store.progress());
    return;
  }

  store.mark(file);
  ctx.fileViews.select(VIEWED_VIEW_ID);
  folds.folded(file);
  if (folds.needsRefold()) {
    /**
     * Hunk enables the command only once it has drawn the selected file in the
     * folded view, and it applies that view to every file the view matches.
     */
    if (await waitUntil(() => ctx.commands.isEnabled(APPLY_TO_ALL_MATCHING))) {
      ctx.commands.execute(APPLY_TO_ALL_MATCHING);
    }
    folds.refolded(store.viewedFiles());
  }
  const progress = store.progress();
  showProgress(ctx.statusLine, progress);

  const next = findNextUnviewed({
    files: ctx.selection.files,
    fromFileId: file.id,
    isViewed: store.isViewed,
  });
  if (next) {
    ctx.navigation.selectFile(next.id);
  } else if (progress.viewed === progress.total) {
    const noun = progress.total === 1 ? 'file' : 'files';
    ctx.notify(`All ${progress.total} ${noun} viewed`, 'info');
  } else {
    /** The filter hides the files that are still unviewed. */
    ctx.notify('No unviewed file is visible', 'info');
  }
};

export default toggleViewed;
