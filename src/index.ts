import type {
  ExtensionChangeset,
  ExtensionEventContext,
  HunkExtensionAPI,
} from 'hunkdiff/extension';

import createViewedFileView from './createViewedFileView.ts';
import createViewedStore from './createViewedStore.ts';
import showProgress from './showProgress.ts';
import toggleViewed, { TOGGLE_VIEWED_COMMAND } from './toggleViewed.ts';

const viewedExtension = (hunk: HunkExtensionAPI): void => {
  const store = createViewedStore();

  hunk.registerFileView(createViewedFileView(store));
  hunk.registerCommand(TOGGLE_VIEWED_COMMAND, (ctx) => {
    toggleViewed(ctx, store);
  });

  /** A load or reload brings new patches: drop the marks they changed. */
  const reconcile = (
    { changeset }: { readonly changeset: ExtensionChangeset },
    ctx: ExtensionEventContext,
  ): void => {
    store.reconcile(changeset.files);
    showProgress(ctx.statusLine, store.progress());
  };
  hunk.on('changeset_loaded', reconcile);
  hunk.on('session_reload', reconcile);
};

export default viewedExtension;
