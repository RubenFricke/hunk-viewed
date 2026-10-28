import type {
  ExtensionCommand,
  ExtensionContext,
  ExtensionFileViewControls,
  ExtensionReviewSelection,
  ExtensionStatusLineControls,
} from 'hunkdiff/extension';

import { VIEWED_VIEW_ID } from './createViewedFileView.ts';
import type { ViewedStore } from './createViewedStore.ts';
import showProgress from './showProgress.ts';

/** The command, with `x` as its default key. Users remap it by its id. */
export const TOGGLE_VIEWED_COMMAND = {
  id: 'toggleViewed',
  title: 'Toggle viewed on the selected file',
  key: 'x',
} as const satisfies ExtensionCommand;

/** The parts of Hunk's command context that toggling uses. */
interface ToggleViewedContext extends Pick<ExtensionContext, 'notify'> {
  readonly selection: Pick<ExtensionReviewSelection, 'file'>;
  readonly fileViews: Pick<ExtensionFileViewControls, 'select'>;
  readonly statusLine: ExtensionStatusLineControls;
}

/**
 * Marks the selected file viewed and folds it, or unmarks and unfolds a viewed
 * file. The selection stays on the file.
 *
 * @remarks
 *   The mark comes before the view: the folded view only matches viewed files.
 * @param ctx - Hunk's command context.
 * @param store - The viewed marks of the session.
 */
const toggleViewed = (ctx: ToggleViewedContext, store: ViewedStore): void => {
  const { file } = ctx.selection;
  if (!file) {
    ctx.notify('Select a file to mark it viewed', 'info');
    return;
  }

  if (store.isViewed(file)) {
    store.unmark(file);
    ctx.fileViews.select(null);
  } else {
    store.mark(file);
    ctx.fileViews.select(VIEWED_VIEW_ID);
  }
  showProgress(ctx.statusLine, store.progress());
};

export default toggleViewed;
