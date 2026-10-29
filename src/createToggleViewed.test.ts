import type {
  ExtensionDiffFile,
  ExtensionStatusItem,
} from 'hunkdiff/extension';
import { describe, expect, it } from 'vitest';

import createToggleViewed from './createToggleViewed.ts';
import createViewedStore, { type ViewedStore } from './createViewedStore.ts';
import fakeDiffFile from '../test/fakeDiffFile.ts';

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
  patch: '@@ -7,1 +7,1 @@\n-return 1;\n+return 2;',
});

const recordContext = (
  file: ExtensionDiffFile | null,
  {
    files = [CART, ORDER, USER],
    isApplyEnabled = true,
    applyThrows = false,
  }: {
    files?: readonly ExtensionDiffFile[];
    isApplyEnabled?: boolean;
    applyThrows?: boolean;
  } = {},
): {
  ctx: Parameters<ReturnType<typeof createToggleViewed>>[0];
  selectedViews: (string | null)[];
  selectedFileIds: string[];
  executedCommands: string[];
  statusItems: ExtensionStatusItem[];
  notices: string[];
} => {
  const selectedViews: (string | null)[] = [];
  const selectedFileIds: string[] = [];
  const executedCommands: string[] = [];
  const statusItems: ExtensionStatusItem[] = [];
  const notices: string[] = [];
  return {
    selectedViews,
    selectedFileIds,
    executedCommands,
    statusItems,
    notices,
    ctx: {
      selection: { file, files },
      fileViews: {
        select: (viewId) => {
          selectedViews.push(viewId);
        },
      },
      navigation: {
        selectFile: (fileId) => {
          selectedFileIds.push(fileId);
        },
      },
      commands: {
        isEnabled: (commandId) =>
          commandId === APPLY_TO_ALL_MATCHING && isApplyEnabled,
        execute: (commandId) => {
          if (applyThrows) {
            throw new Error('Hunk is reloading');
          }
          executedCommands.push(commandId);
          return true;
        },
      },
      statusLine: {
        set: (item) => {
          statusItems.push(item);
        },
        clear: () => undefined,
      },
      notify: (message) => {
        notices.push(message);
      },
    },
  };
};

const createDependencies = ({
  waitForHunk = () => Promise.resolve(),
}: { waitForHunk?: () => Promise<void> } = {}): {
  store: ViewedStore;
  announce: () => void;
  waitForHunk: () => Promise<void>;
  announcements: number[];
} => {
  const store = createViewedStore();
  const announcements: number[] = [];
  return {
    store,
    announce: () => {
      announcements.push(store.viewedFiles().length);
    },
    waitForHunk,
    announcements,
  };
};

describe('createToggleViewed', () => {
  it('marks an unviewed file and folds it', async () => {
    const dependencies = createDependencies();
    const { ctx, selectedViews } = recordContext(CART);
    await createToggleViewed(dependencies)(ctx);

    expect(dependencies.store.isViewed(CART)).toBe(true);
    expect(selectedViews).toEqual(['viewed']);
  });

  it('jumps to the next unviewed file after marking', async () => {
    const dependencies = createDependencies();
    dependencies.store.mark(ORDER);
    const { ctx, selectedFileIds } = recordContext(CART);
    await createToggleViewed(dependencies)(ctx);

    expect(selectedFileIds).toEqual(['git:2:src/user.ts']);
  });

  it('jumps back to an earlier unviewed file after the last file', async () => {
    const dependencies = createDependencies();
    dependencies.store.mark(ORDER);
    const { ctx, selectedFileIds } = recordContext(USER);
    await createToggleViewed(dependencies)(ctx);

    expect(selectedFileIds).toEqual(['git:0:src/cart.ts']);
  });

  it('stays and says so when every file is viewed', async () => {
    const dependencies = createDependencies();
    dependencies.store.reconcile([CART, ORDER, USER]);
    dependencies.store.mark(CART);
    dependencies.store.mark(ORDER);
    const { ctx, selectedFileIds, notices } = recordContext(USER);
    await createToggleViewed(dependencies)(ctx);

    expect(selectedFileIds).toEqual([]);
    expect(notices).toEqual(['All 3 files viewed']);
  });

  it('says so when only hidden files are still unviewed', async () => {
    const dependencies = createDependencies();
    dependencies.store.reconcile([CART, ORDER, USER]);
    const { ctx, selectedFileIds, notices } = recordContext(CART, {
      files: [CART],
    });
    await createToggleViewed(dependencies)(ctx);

    expect(selectedFileIds).toEqual([]);
    expect(notices).toEqual(['No unviewed file is visible']);
  });

  it('unmarks a viewed file, returns it to the raw diff and stays', async () => {
    const dependencies = createDependencies();
    dependencies.store.mark(CART);
    const { ctx, selectedViews, selectedFileIds } = recordContext(CART);
    await createToggleViewed(dependencies)(ctx);

    expect(dependencies.store.isViewed(CART)).toBe(false);
    expect(selectedViews).toEqual([null]);
    expect(selectedFileIds).toEqual([]);
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
    await createToggleViewed(dependencies)(ctx);

    expect(seenWhileWaiting).toEqual([0, 0]);
    expect(executedCommands).toEqual([APPLY_TO_ALL_MATCHING]);
    expect(selectedFileIds).toEqual(['git:2:src/user.ts']);
  });

  it('jumps on when Hunk has nothing left to fold', async () => {
    const dependencies = createDependencies();
    const { ctx, executedCommands, selectedFileIds } = recordContext(CART, {
      isApplyEnabled: false,
    });
    await createToggleViewed(dependencies)(ctx);

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
    await createToggleViewed(dependencies)(ctx);

    expect(waits).toBe(0);
  });

  it('ignores a second x while the first one waits for Hunk', async () => {
    let hunkHasDrawn = (): void => undefined;
    const dependencies = createDependencies({
      waitForHunk: () =>
        new Promise((resolve) => {
          hunkHasDrawn = resolve;
        }),
    });
    const toggleViewed = createToggleViewed(dependencies);
    const { ctx, selectedViews, selectedFileIds } = recordContext(CART);
    const first = toggleViewed(ctx);
    const second = toggleViewed(ctx);
    hunkHasDrawn();
    await Promise.all([first, second]);

    expect(dependencies.store.isViewed(CART)).toBe(true);
    expect(selectedViews).toEqual(['viewed']);
    expect(selectedFileIds).toEqual(['git:1:src/order.ts']);
  });

  it('accepts the next x after the first one failed', async () => {
    const dependencies = createDependencies();
    const toggleViewed = createToggleViewed(dependencies);
    const failing = recordContext(CART, { applyThrows: true });
    await expect(toggleViewed(failing.ctx)).rejects.toThrow(
      'Hunk is reloading',
    );
    const { ctx, selectedViews } = recordContext(CART);
    await toggleViewed(ctx);

    expect(dependencies.store.isViewed(CART)).toBe(false);
    expect(selectedViews).toEqual([null]);
  });

  it('announces every mark and unmark', async () => {
    const dependencies = createDependencies();
    dependencies.store.reconcile([CART, ORDER, USER]);
    const toggleViewed = createToggleViewed(dependencies);
    const { ctx } = recordContext(CART);
    await toggleViewed(ctx);
    await toggleViewed(ctx);

    expect(dependencies.announcements).toEqual([1, 0]);
  });

  it('shows the progress after each toggle', async () => {
    const dependencies = createDependencies();
    dependencies.store.reconcile([CART, ORDER, USER]);
    const toggleViewed = createToggleViewed(dependencies);
    const { ctx, statusItems } = recordContext(CART);
    await toggleViewed(ctx);
    await toggleViewed(ctx);

    expect(statusItems.map((item) => item.spans[0]?.text)).toEqual([
      '1 of 3 files viewed',
      '0 of 3 files viewed',
    ]);
  });

  it('tells the user when no file is selected', async () => {
    const dependencies = createDependencies();
    const { ctx, selectedViews, notices } = recordContext(null);
    await createToggleViewed(dependencies)(ctx);

    expect(notices).toEqual(['Select a file to mark it viewed']);
    expect(selectedViews).toEqual([]);
  });
});
