import type {
  ExtensionChangeset,
  ExtensionEventContext,
  HunkExtensionAPI,
} from 'hunkdiff/extension';

import announceViewedChange from './announceViewedChange.ts';
import createToggleViewed, {
  TOGGLE_VIEWED_COMMAND,
} from './createToggleViewed.ts';
import createViewedFileView from './createViewedFileView.ts';
import createViewedStore from './createViewedStore.ts';
import showProgress from './showProgress.ts';

const viewedExtension = (hunk: HunkExtensionAPI): void => {
  const store = createViewedStore();
  const announce = (): void => {
    announceViewedChange(hunk.events, store);
  };

  hunk.registerFileView(createViewedFileView(store));
  hunk.registerCommand(
    TOGGLE_VIEWED_COMMAND,
    createToggleViewed({ store, announce }),
  );

  /** A load or reload brings new patches: drop the marks they changed. */
  const reconcile = (
    { changeset }: { readonly changeset: ExtensionChangeset },
    ctx: ExtensionEventContext,
  ): void => {
    if (store.reconcile(changeset.files)) {
      announce();
    }
    showProgress(ctx.statusLine, store.progress());
  };
  hunk.on('changeset_loaded', reconcile);
  hunk.on('session_reload', reconcile);
};

export default viewedExtension;
