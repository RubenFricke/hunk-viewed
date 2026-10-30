import { describe, expect, it } from 'vitest';

import createToggleFile from './createToggleFile.ts';
import createToggleHunk from './createToggleHunk.ts';
import createViewedStore, { type ViewedStore } from './createViewedStore.ts';
import fakeDiffFile from '../test/fakeDiffFile.ts';
import recordCommandContext from '../test/recordCommandContext.ts';

const APPLY_TO_ALL_MATCHING = 'hunk.view.applyFilePresentationToAllMatching';

const CART = fakeDiffFile({
  id: 'git:0:src/cart.ts',
  path: 'src/cart.ts',
  patch: '@@ -1,1 +1,1 @@\n-return 1;\n+return 2;',
});
const LOGO = fakeDiffFile({
  id: 'git:1:logo.bin',
  path: 'logo.bin',
  patch: 'Binary files a/logo.bin and b/logo.bin differ',
});
const USER = fakeDiffFile({
  id: 'git:2:src/user.ts',
  path: 'src/user.ts',
  patch: [
    '@@ -7,1 +7,1 @@',
    '-return 1;',
    '+return 2;',
    '@@ -20,1 +20,1 @@',
    '-greet();',
    '+greet(name);',
    '@@ -40,1 +40,1 @@',
    '-bye();',
    '+bye(name);',
  ].join('\n'),
});
const FILES = [CART, LOGO, USER];

const createDependencies = ({
  waitForHunk = () => Promise.resolve(),
}: { waitForHunk?: () => Promise<void> } = {}): {
  store: ViewedStore;
  announce: () => void;
  showHunks: () => void;
  waitForHunk: () => Promise<void>;
  toggleFile: ReturnType<typeof createToggleFile>;
  announcements: number[];
  hunkStatusCalls: (string | null)[];
} => {
  const store = createViewedStore();
  const announcements: number[] = [];
  const hunkStatusCalls: (string | null)[] = [];
  const announce = (): void => {
    announcements.push(store.viewedFiles().length);
  };
  const showHunks = (
    _statusLine?: unknown,
    file?: { path: string } | null,
  ): void => {
    hunkStatusCalls.push(file?.path ?? null);
  };
  return {
    store,
    announce,
    showHunks,
    waitForHunk,
    toggleFile: createToggleFile({ store, announce, showHunks, waitForHunk }),
    announcements,
    hunkStatusCalls,
  };
};

const recordContext = (
  file: typeof CART | null,
  hunkIndex: number | null,
  options: { files?: readonly (typeof CART)[]; isApplyEnabled?: boolean } = {},
) => recordCommandContext(file, { files: FILES, hunkIndex, ...options });

describe('createToggleHunk', () => {
  it('marks the selected hunk and jumps to the next unviewed hunk', async () => {
    const dependencies = createDependencies();
    const { ctx, selectedHunks, refreshedFileIds, selectedViews } =
      recordContext(USER, 0);
    await createToggleHunk(dependencies)(ctx);

    expect(dependencies.store.isHunkViewed(USER, 0)).toBe(true);
    expect(dependencies.store.isViewed(USER)).toBe(false);
    expect(refreshedFileIds).toEqual(['git:2:src/user.ts']);
    expect(selectedHunks).toEqual(['git:2:src/user.ts#1']);
    expect(selectedViews).toEqual([]);
    expect(dependencies.hunkStatusCalls).toEqual(['src/user.ts']);
  });

  it('folds the file once its last hunk is viewed', async () => {
    const dependencies = createDependencies();
    const { store } = dependencies;
    store.reconcile(FILES);
    store.markHunk(USER, 0);
    store.markHunk(USER, 1);
    const { ctx, selectedViews, executedCommands, selectedHunks } =
      recordContext(USER, 2);
    await createToggleHunk(dependencies)(ctx);

    expect(store.isViewed(USER)).toBe(true);
    expect(selectedViews).toEqual(['viewed']);
    expect(executedCommands).toEqual([APPLY_TO_ALL_MATCHING]);
    expect(dependencies.announcements).toEqual([1]);
    expect(selectedHunks).toEqual(['git:0:src/cart.ts#0']);
  });

  it('stops on a file without hunks as a whole', async () => {
    const dependencies = createDependencies();
    dependencies.store.mark(USER);
    const { ctx, selectedFileIds, selectedHunks } = recordContext(CART, 0);
    await createToggleHunk(dependencies)(ctx);

    expect(selectedFileIds).toEqual(['git:1:logo.bin']);
    expect(selectedHunks).toEqual([]);
  });

  it('toggles a file without hunks as a whole', async () => {
    const dependencies = createDependencies();
    const { ctx, selectedViews, selectedFileIds } = recordContext(LOGO, null);
    await createToggleHunk(dependencies)(ctx);

    expect(dependencies.store.isViewed(LOGO)).toBe(true);
    expect(selectedViews).toEqual(['viewed']);
    expect(selectedFileIds).toEqual(['git:2:src/user.ts']);
  });

  it('unmarks a viewed hunk and stays', async () => {
    const dependencies = createDependencies();
    dependencies.store.markHunk(USER, 1);
    const { ctx, selectedHunks, refreshedFileIds } = recordContext(USER, 1);
    await createToggleHunk(dependencies)(ctx);

    expect(dependencies.store.isHunkViewed(USER, 1)).toBe(false);
    expect(selectedHunks).toEqual([]);
    expect(refreshedFileIds).toEqual(['git:2:src/user.ts']);
  });

  it('reopens a folded file with no hunk viewed, like X', async () => {
    const dependencies = createDependencies();
    const { store } = dependencies;
    store.reconcile(FILES);
    store.markHunk(USER, 0);
    store.markHunk(USER, 1);
    store.mark(USER);
    const { ctx, selectedViews, selectedHunks, refreshedFileIds } =
      recordContext(USER, 0);
    await createToggleHunk(dependencies)(ctx);

    expect(store.isViewed(USER)).toBe(false);
    expect(store.hunkProgress(USER)).toEqual({ viewed: 0, total: 3 });
    expect(selectedViews).toEqual([null]);
    expect(selectedHunks).toEqual([]);
    expect(refreshedFileIds).toEqual(['git:2:src/user.ts']);
    expect(dependencies.announcements).toEqual([0]);
  });

  it('reopens a file that folded hunk by hunk with every hunk unviewed', async () => {
    const dependencies = createDependencies();
    const { store } = dependencies;
    store.reconcile(FILES);
    const toggleHunk = createToggleHunk(dependencies);
    for (const hunkIndex of [0, 1, 2]) {
      await toggleHunk(recordContext(USER, hunkIndex).ctx);
    }
    expect(store.isViewed(USER)).toBe(true);

    await toggleHunk(recordContext(USER, 2).ctx);

    expect(store.isViewed(USER)).toBe(false);
    expect(store.hunkProgress(USER)).toEqual({ viewed: 0, total: 3 });
  });

  it('says so when every file is viewed', async () => {
    const dependencies = createDependencies();
    const { store } = dependencies;
    store.reconcile(FILES);
    store.mark(CART);
    store.mark(LOGO);
    store.markHunk(USER, 0);
    store.markHunk(USER, 1);
    const { ctx, notices, selectedHunks } = recordContext(USER, 2);
    await createToggleHunk(dependencies)(ctx);

    expect(selectedHunks).toEqual([]);
    expect(notices).toEqual(['All 3 files viewed']);
  });

  it('says so when only hidden files are still unviewed', async () => {
    const dependencies = createDependencies();
    dependencies.store.reconcile(FILES);
    const { ctx, notices } = recordContext(CART, 0, { files: [CART] });
    await createToggleHunk(dependencies)(ctx);

    expect(notices).toEqual(['No unviewed file is visible']);
  });

  it('ignores a second x while the fold waits for Hunk', async () => {
    let hunkHasDrawn = (): void => undefined;
    const dependencies = createDependencies({
      waitForHunk: () =>
        new Promise((resolve) => {
          hunkHasDrawn = resolve;
        }),
    });
    const toggleHunk = createToggleHunk(dependencies);
    const { ctx, selectedViews } = recordContext(CART, 0);
    const first = toggleHunk(ctx);
    const second = toggleHunk(ctx);
    hunkHasDrawn();
    await Promise.all([first, second]);

    expect(dependencies.store.isViewed(CART)).toBe(true);
    expect(selectedViews).toEqual(['viewed']);
  });

  it('tells the user when no hunk is selected', async () => {
    const dependencies = createDependencies();
    const { ctx, notices } = recordContext(null, null);
    await createToggleHunk(dependencies)(ctx);

    expect(notices).toEqual(['Select a hunk to mark it viewed']);
  });
});
