import type {
  ExtensionCommand,
  ExtensionCommandControls,
  ExtensionContext,
  ExtensionFileViewControls,
  ExtensionReviewNavigation,
  ExtensionReviewSelection,
  ExtensionStatusLineControls,
} from 'hunkdiff/extension';

import { VIEWED_VIEW_ID } from './createViewedFileView.ts';
import type { ViewedStore } from './createViewedStore.ts';
import showProgress from './showProgress.ts';
import findNextUnviewed from './utils/findNextUnviewed.ts';
import yieldToHunk from './utils/yieldToHunk.ts';

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
  readonly announce: () => void;
  readonly waitForHunk?: () => Promise<void>;
}

type ToggleViewed = (ctx: ToggleViewedContext) => Promise<void>;

/**
 * The store is the only record of what is viewed. Every mark folds the selected
 * file and then has Hunk fold every other viewed file as well, which brings
 * back the folds that a reload dropped by giving files new ids.
 */
const createToggleViewed = ({
  store,
  announce,
  waitForHunk = yieldToHunk,
}: ToggleViewedDependencies): ToggleViewed => {
  let isMarking = false;

  return async (ctx) => {
    /**
     * A held key arrives as a burst, and each press sees the selection as it
     * was before the first one jumped, so a second press would unmark again.
     */
    if (isMarking) {
      return;
    }
    const { file } = ctx.selection;
    if (!file) {
      ctx.notify('Select a file to mark it viewed', 'info');
      return;
    }

    if (store.isViewed(file)) {
      store.unmark(file);
      ctx.fileViews.select(null);
      showProgress(ctx.statusLine, store.progress());
      announce();
      return;
    }

    isMarking = true;
    try {
      store.mark(file);
      ctx.fileViews.select(VIEWED_VIEW_ID);
      const progress = store.progress();
      showProgress(ctx.statusLine, progress);
      announce();

      /**
       * Hunk enables the command once it has drawn the selected file in the
       * folded view and some other file the view matches is not folded.
       */
      await waitForHunk();
      if (ctx.commands.isEnabled(APPLY_TO_ALL_MATCHING)) {
        ctx.commands.execute(APPLY_TO_ALL_MATCHING);
      }

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
    } finally {
      isMarking = false;
    }
  };
};

export default createToggleViewed;
