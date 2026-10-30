import { describe, expect, it } from 'vitest';

import createToggleFile from './createToggleFile.ts';
import createViewedStore, { type ViewedStore } from './createViewedStore.ts';
import fakeDiffFile from '../test/fakeDiffFile.ts';
import recordCommandContext from '../test/recordCommandContext.ts';

const APPLY_TO_ALL_MATCHING = 'hunk.view.applyFilePresentationToAllMatching';

const CART = fakeDiffFile({
  id: 'git:0:src/cart.ts',
  path: 'src/cart.ts',
  patch: '@@ -1,1 +1,1 @@\n-return 1;\n+return 2;',
});
const ORDER = fakeDiffFile({
  id: 'git:1:src/order.ts',
  path: 'src/order.ts',
  patch: '@@ -4,1 +4,1 @@\n-return 1;\n+return 2;',
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
  ].join('\n'),
});
const FILES = [CART, ORDER, USER];

const recordContext = (
  file: typeof CART | null,
  options: { files?: readonly (typeof CART)[]; isApplyEnabled?: boolean } = {},
) => recordCommandContext(file, { files: FILES, ...options });

const createDependencies = ({
  waitForHunk = () => Promise.resolve(),
}: { waitForHunk?: () => Promise<void> } = {}): {
  store: ViewedStore;
  announce: () => void;
  showHunks: () => void;
  waitForHunk: () => Promise<void>;
  announcements: number[];
  hunkStatusCalls: (string | null)[];
} => {
  const store = createViewedStore();
  const announcements: number[] = [];
  const hunkStatusCalls: (string | null)[] = [];
  return {
    store,
    announce: () => {
      announcements.push(store.viewedFiles().length);
    },
    showHunks: (_statusLine?: unknown, file?: { path: string } | null) => {
      hunkStatusCalls.push(file?.path ?? null);
    },
    waitForHunk,
    announcements,
    hunkStatusCalls,
  };
};

describe('createToggleFile', () => {
  it('marks an unviewed file and folds it', async () => {
    const dependencies = createDependencies();
    const { ctx, selectedViews } = recordContext(CART);
    await createToggleFile(dependencies)(ctx);

    expect(dependencies.store.isViewed(CART)).toBe(true);
    expect(selectedViews).toEqual(['viewed']);
  });

  it('jumps to the next unviewed file after marking', async () => {
    const dependencies = createDependencies();
    dependencies.store.mark(ORDER);
    const { ctx, selectedFileIds } = recordContext(CART);
    await createToggleFile(dependencies)(ctx);

    expect(selectedFileIds).toEqual(['git:2:src/user.ts']);
  });

  it('jumps back to an earlier unviewed file after the last file', async () => {
    const dependencies = createDependencies();
    dependencies.store.mark(ORDER);
    const { ctx, selectedFileIds } = recordContext(USER);
    await createToggleFile(dependencies)(ctx);

    expect(selectedFileIds).toEqual(['git:0:src/cart.ts']);
  });

  it('stays and says so when every file is viewed', async () => {
    const dependencies = createDependencies();
    dependencies.store.reconcile(FILES);
    dependencies.store.mark(CART);
    dependencies.store.mark(ORDER);
    const { ctx, selectedFileIds, notices } = recordContext(USER);
    await createToggleFile(dependencies)(ctx);

    expect(selectedFileIds).toEqual([]);
    expect(notices).toEqual(['All 3 files viewed']);
  });

  it('says so when only hidden files are still unviewed', async () => {
    const dependencies = createDependencies();
    dependencies.store.reconcile(FILES);
    const { ctx, selectedFileIds, notices } = recordContext(CART, {
      files: [CART],
    });
    await createToggleFile(dependencies)(ctx);

    expect(selectedFileIds).toEqual([]);
    expect(notices).toEqual(['No unviewed file is visible']);
  });

  it('unmarks a viewed file, returns it to the raw diff and stays', async () => {
    const dependencies = createDependencies();
    dependencies.store.mark(CART);
    const { ctx, selectedViews, selectedFileIds } = recordContext(CART);
    await createToggleFile(dependencies)(ctx);

    expect(dependencies.store.isViewed(CART)).toBe(false);
    expect(selectedViews).toEqual([null]);
    expect(selectedFileIds).toEqual([]);
  });

  it('forgets the hunk marks when it unmarks a file', async () => {
    const dependencies = createDependencies();
    const { store } = dependencies;
    store.markHunk(USER, 0);
    store.mark(USER);
    const { ctx, refreshedFileIds } = recordContext(USER);
    await createToggleFile(dependencies)(ctx);

    expect(store.isHunkViewed(USER, 0)).toBe(false);
    expect(store.hunkProgress(USER)).toEqual({ viewed: 0, total: 2 });
    expect(refreshedFileIds).toEqual(['git:2:src/user.ts']);
    expect(dependencies.hunkStatusCalls).toEqual(['src/user.ts']);
  });

  it('folds the other viewed files once Hunk has drawn the fold', async () => {
    const seenWhileWaiting: number[] = [];
    const { ctx, executedCommands, selectedFileIds } = recordContext(CART);
    const dependencies = createDependencies({
      waitForHunk: () => {
        seenWhileWaiting.push(executedCommands.length, selectedFileIds.length);
        return Promise.resolve();
      },
    });
    dependencies.store.mark(ORDER);
    await createToggleFile(dependencies)(ctx);

    expect(seenWhileWaiting).toEqual([0, 0]);
    expect(executedCommands).toEqual([APPLY_TO_ALL_MATCHING]);
    expect(selectedFileIds).toEqual(['git:2:src/user.ts']);
  });

  it('jumps on when Hunk has nothing left to fold', async () => {
    const dependencies = createDependencies();
    const { ctx, executedCommands, selectedFileIds } = recordContext(CART, {
      isApplyEnabled: false,
    });
    await createToggleFile(dependencies)(ctx);

    expect(executedCommands).toEqual([]);
    expect(selectedFileIds).toEqual(['git:1:src/order.ts']);
  });

  it('does not wait for Hunk when it unmarks', async () => {
    let waits = 0;
    const dependencies = createDependencies({
      waitForHunk: () => {
        waits += 1;
        return Promise.resolve();
      },
    });
    dependencies.store.mark(CART);
    const { ctx } = recordContext(CART);
    await createToggleFile(dependencies)(ctx);

    expect(waits).toBe(0);
  });

  it('ignores a second X while the first one waits for Hunk', async () => {
    let hunkHasDrawn = (): void => undefined;
    const dependencies = createDependencies({
      waitForHunk: () =>
        new Promise((resolve) => {
          hunkHasDrawn = resolve;
        }),
    });
    const toggleFile = createToggleFile(dependencies);
    const { ctx, selectedViews, selectedFileIds } = recordContext(CART);
    const first = toggleFile(ctx);
    const second = toggleFile(ctx);
    hunkHasDrawn();
    await Promise.all([first, second]);

    expect(dependencies.store.isViewed(CART)).toBe(true);
    expect(selectedViews).toEqual(['viewed']);
    expect(selectedFileIds).toEqual(['git:1:src/order.ts']);
  });

  it('accepts the next X after the first one failed', async () => {
    const dependencies = createDependencies();
    const toggleFile = createToggleFile(dependencies);
    const failing = recordCommandContext(CART, {
      files: FILES,
      applyThrows: true,
    });
    await expect(toggleFile(failing.ctx)).rejects.toThrow('Hunk is reloading');
    const { ctx, selectedViews } = recordContext(CART);
    await toggleFile(ctx);

    expect(dependencies.store.isViewed(CART)).toBe(false);
    expect(selectedViews).toEqual([null]);
  });

  it('announces every mark and unmark', async () => {
    const dependencies = createDependencies();
    dependencies.store.reconcile(FILES);
    const toggleFile = createToggleFile(dependencies);
    const { ctx } = recordContext(CART);
    await toggleFile(ctx);
    await toggleFile(ctx);

    expect(dependencies.announcements).toEqual([1, 0]);
  });

  it('shows the progress after each toggle', async () => {
    const dependencies = createDependencies();
    dependencies.store.reconcile(FILES);
    const toggleFile = createToggleFile(dependencies);
    const { ctx, statusItems } = recordContext(CART);
    await toggleFile(ctx);
    await toggleFile(ctx);

    expect(statusItems.map((item) => item.spans[0]?.text)).toEqual([
      '1 of 3 files viewed',
      '0 of 3 files viewed',
    ]);
  });

  it('tells the user when no file is selected', async () => {
    const dependencies = createDependencies();
    const { ctx, selectedViews, notices } = recordContext(null);
    await createToggleFile(dependencies)(ctx);

    expect(notices).toEqual(['Select a file to mark it viewed']);
    expect(selectedViews).toEqual([]);
  });
});
