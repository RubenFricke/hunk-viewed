import type {
  ExtensionCommand,
  ExtensionReviewNavigation,
  ExtensionReviewSelection,
} from 'hunkdiff/extension';

import type {
  ToggleFile,
  ToggleFileContext,
  ToggleFileDependencies,
} from './createToggleFile.ts';
import { VIEWED_HUNKS_HIGHLIGHTER_ID } from './createViewedHighlighter.ts';
import foldViewedFile from './foldViewedFile.ts';
import findNextUnviewedHunk from './utils/findNextUnviewedHunk.ts';
import yieldToHunk from './utils/yieldToHunk.ts';

/** Users remap the key by this id, so the id must not change. */
export const TOGGLE_HUNK_COMMAND = {
  id: 'toggleHunk',
  title: 'Toggle viewed on the selected hunk',
  key: 'x',
} as const satisfies ExtensionCommand;

interface ToggleHunkContext extends ToggleFileContext {
  readonly selection: Pick<
    ExtensionReviewSelection,
    'file' | 'files' | 'hunkIndex'
  >;
  readonly navigation: Pick<
    ExtensionReviewNavigation,
    'selectFile' | 'selectHunk'
  >;
}

interface ToggleHunkDependencies extends ToggleFileDependencies {
  /** A file without hunks, such as a binary one, toggles as a whole. */
  readonly toggleFile: ToggleFile;
}

type ToggleHunk = (ctx: ToggleHunkContext) => Promise<void>;

/**
 * A viewed hunk is dimmed; the file folds once its last hunk is viewed. Each
 * mark moves on to the next hunk that is still unviewed, in this file or a
 * later one, because a file view cannot fold one hunk on its own. A folded file
 * opens with no hunk viewed, whichever key opens it.
 */
const createToggleHunk = ({
  store,
  announce,
  showHunks,
  toggleFile,
  waitForHunk = yieldToHunk,
}: ToggleHunkDependencies): ToggleHunk => {
  let isMarking = false;

  return async (ctx) => {
    if (isMarking) {
      return;
    }
    const { file } = ctx.selection;
    if (!file) {
      ctx.notify('Select a hunk to mark it viewed', 'info');
      return;
    }
    const hunks = store.hunksOf(file);
    if (hunks.length === 0) {
      await toggleFile(ctx);
      return;
    }
    const index = ctx.selection.hunkIndex ?? 0;
    const refresh = (): void => {
      ctx.highlights.refresh(VIEWED_HUNKS_HIGHLIGHTER_ID, { fileId: file.id });
    };

    /** A folded file was viewed as a whole, so opening it starts over. */
    if (store.isViewed(file)) {
      await toggleFile(ctx);
      return;
    }

    if (store.isHunkViewed(file, index)) {
      store.unmarkHunk(file, index);
      refresh();
      showHunks(ctx.statusLine, file);
      return;
    }

    store.markHunk(file, index);
    refresh();
    const isLastHunk = hunks.every((_, hunkIndex) =>
      store.isHunkViewed(file, hunkIndex),
    );
    isMarking = true;
    try {
      const progress = isLastHunk
        ? await foldViewedFile(ctx, file, { store, announce, waitForHunk })
        : store.progress();
      showHunks(ctx.statusLine, file);

      const next = findNextUnviewedHunk({
        files: ctx.selection.files,
        fromFileId: file.id,
        fromHunkIndex: index,
        isViewed: store.isViewed,
        hunkCount: (candidate) => store.hunksOf(candidate).length,
        isHunkViewed: store.isHunkViewed,
      });
      if (next) {
        if (next.hunkIndex === null) {
          ctx.navigation.selectFile(next.file.id);
        } else {
          ctx.navigation.selectHunk(next.file.id, next.hunkIndex);
        }
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

export default createToggleHunk;
