import type {
  ExtensionCommand,
  ExtensionContext,
  ExtensionLineHighlightControls,
  ExtensionReviewNavigation,
  ExtensionReviewSelection,
  ExtensionStatusLineControls,
} from 'hunkdiff/extension';

import { VIEWED_HUNKS_HIGHLIGHTER_ID } from './createViewedHighlighter.ts';
import type { ViewedFile, ViewedStore } from './createViewedStore.ts';
import foldViewedFile, { type FoldContext } from './foldViewedFile.ts';
import showProgress from './showProgress.ts';
import findNextUnviewed from './utils/findNextUnviewed.ts';
import yieldToHunk from './utils/yieldToHunk.ts';

/** Users remap the key by this id, so the id must not change. */
export const TOGGLE_FILE_COMMAND = {
  id: 'toggleFile',
  title: 'Toggle viewed on the whole file',
  key: 'X',
} as const satisfies ExtensionCommand;

export interface ToggleFileContext
  extends FoldContext, Pick<ExtensionContext, 'notify'> {
  readonly selection: Pick<ExtensionReviewSelection, 'file' | 'files'>;
  readonly navigation: Pick<ExtensionReviewNavigation, 'selectFile'>;
  readonly highlights: Pick<ExtensionLineHighlightControls, 'refresh'>;
}

export interface ToggleFileDependencies {
  readonly store: ViewedStore;
  readonly announce: () => void;
  /** Shows the hunk count of a file on the status line, or clears it. */
  readonly showHunks: (
    statusLine: ExtensionStatusLineControls,
    file: ViewedFile | null,
  ) => void;
  readonly waitForHunk?: () => Promise<void>;
}

export type ToggleFile = (ctx: ToggleFileContext) => Promise<void>;

/** Marks the whole file at once; unmarking also forgets its hunk marks. */
const createToggleFile = ({
  store,
  announce,
  showHunks,
  waitForHunk = yieldToHunk,
}: ToggleFileDependencies): ToggleFile => {
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
      store.clearHunks(file);
      ctx.fileViews.select(null);
      ctx.highlights.refresh(VIEWED_HUNKS_HIGHLIGHTER_ID, { fileId: file.id });
      showProgress(ctx.statusLine, store.progress());
      showHunks(ctx.statusLine, file);
      announce();
      return;
    }

    isMarking = true;
    try {
      const progress = await foldViewedFile(ctx, file, {
        store,
        announce,
        waitForHunk,
      });
      showHunks(ctx.statusLine, file);

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

export default createToggleFile;
