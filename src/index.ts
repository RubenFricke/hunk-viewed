import type {
  ExtensionChangeset,
  ExtensionEventContext,
  ExtensionStatusLineControls,
  HunkExtensionAPI,
} from 'hunkdiff/extension';

import announceViewedChange from './announceViewedChange.ts';
import createToggleFile, { TOGGLE_FILE_COMMAND } from './createToggleFile.ts';
import createToggleHunk, { TOGGLE_HUNK_COMMAND } from './createToggleHunk.ts';
import createViewedFileView from './createViewedFileView.ts';
import createViewedHighlighter from './createViewedHighlighter.ts';
import createViewedStore, { type ViewedFile } from './createViewedStore.ts';
import showHunkProgress from './showHunkProgress.ts';
import showProgress from './showProgress.ts';
import describeChangedFiles from './utils/describeChangedFiles.ts';
import readHunkProgressSetting from './utils/readHunkProgressSetting.ts';

const viewedExtension = (hunk: HunkExtensionAPI): void => {
  const store = createViewedStore();
  const announce = (): void => {
    announceViewedChange(hunk.events, store);
  };
  const showHunks = readHunkProgressSetting(hunk.config)
    ? (
        statusLine: ExtensionStatusLineControls,
        file: ViewedFile | null,
      ): void => {
        showHunkProgress(statusLine, file ? store.hunkProgress(file) : null);
      }
    : (): void => undefined;

  hunk.registerFileView(createViewedFileView(store));
  hunk.registerLineHighlighter(createViewedHighlighter(store));
  const toggleFile = createToggleFile({ store, announce, showHunks });
  hunk.registerCommand(TOGGLE_FILE_COMMAND, toggleFile);
  hunk.registerCommand(
    TOGGLE_HUNK_COMMAND,
    createToggleHunk({ store, announce, showHunks, toggleFile }),
  );

  /**
   * A load or reload brings new patches: drop the marks they changed. Only a
   * file that is still in the review is worth a notice; one that left it has
   * nothing left to look at.
   */
  const reconcile = (
    { changeset }: { readonly changeset: ExtensionChangeset },
    ctx: ExtensionEventContext,
  ): void => {
    const { changed, removed } = store.reconcile(changeset.files);
    if (changed.length > 0 || removed.length > 0) {
      announce();
    }
    if (changed.length > 0) {
      ctx.notify(describeChangedFiles(changed.length), 'info');
    }
    showProgress(ctx.statusLine, store.progress());
    showHunks(ctx.statusLine, null);
  };
  hunk.on('changeset_loaded', reconcile);
  hunk.on('session_reload', reconcile);
  hunk.on('selection_changed', ({ fileId }, ctx) => {
    showHunks(ctx.statusLine, fileId === null ? null : store.fileById(fileId));
  });
};

export default viewedExtension;
