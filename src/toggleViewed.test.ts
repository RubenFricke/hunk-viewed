import type {
  ExtensionDiffFile,
  ExtensionStatusItem,
} from 'hunkdiff/extension';
import { describe, expect, it } from 'vitest';

import createFoldTracker, { type FoldTracker } from './createFoldTracker.ts';
import createViewedStore, { type ViewedStore } from './createViewedStore.ts';
import toggleViewed from './toggleViewed.ts';
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
  }: { files?: readonly ExtensionDiffFile[]; isApplyEnabled?: boolean } = {},
): {
  ctx: Parameters<typeof toggleViewed>[0];
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

const createDependencies = (): {
  store: ViewedStore;
  folds: FoldTracker;
  announce: () => void;
  waitUntil: (check: () => boolean) => Promise<boolean>;
  announcements: number[];
} => {
  const store = createViewedStore();
  const announcements: number[] = [];
  return {
    store,
    folds: createFoldTracker(),
    announce: () => {
      announcements.push(store.viewedFiles().length);
    },
    waitUntil: (check) => Promise.resolve(check()),
    announcements,
  };
};

describe('toggleViewed', () => {
  it('marks an unviewed file and folds it', async () => {
    const dependencies = createDependencies();
    const { ctx, selectedViews } = recordContext(CART);
    await toggleViewed(ctx, dependencies);

    expect(dependencies.store.isViewed(CART)).toBe(true);
    expect(selectedViews).toEqual(['viewed']);
  });

  it('jumps to the next unviewed file after marking', async () => {
    const dependencies = createDependencies();
    dependencies.store.mark(ORDER);
    const { ctx, selectedFileIds } = recordContext(CART);
    await toggleViewed(ctx, dependencies);

    expect(selectedFileIds).toEqual(['git:2:src/user.ts']);
  });

  it('jumps back to an earlier unviewed file after the last file', async () => {
    const dependencies = createDependencies();
    dependencies.store.mark(ORDER);
    const { ctx, selectedFileIds } = recordContext(USER);
    await toggleViewed(ctx, dependencies);

    expect(selectedFileIds).toEqual(['git:0:src/cart.ts']);
  });

  it('stays and says so when every file is viewed', async () => {
    const dependencies = createDependencies();
    dependencies.store.reconcile([CART, ORDER, USER]);
    dependencies.store.mark(CART);
    dependencies.store.mark(ORDER);
    const { ctx, selectedFileIds, notices } = recordContext(USER);
    await toggleViewed(ctx, dependencies);

    expect(selectedFileIds).toEqual([]);
    expect(notices).toEqual(['All 3 files viewed']);
  });

  it('says so when only hidden files are still unviewed', async () => {
    const dependencies = createDependencies();
    dependencies.store.reconcile([CART, ORDER, USER]);
    const { ctx, selectedFileIds, notices } = recordContext(CART, {
      files: [CART],
    });
    await toggleViewed(ctx, dependencies);

    expect(selectedFileIds).toEqual([]);
    expect(notices).toEqual(['No unviewed file is visible']);
  });

  it('unmarks a viewed file, returns it to the raw diff and stays', async () => {
    const dependencies = createDependencies();
    dependencies.store.mark(CART);
    const { ctx, selectedViews, selectedFileIds } = recordContext(CART);
    await toggleViewed(ctx, dependencies);

    expect(dependencies.store.isViewed(CART)).toBe(false);
    expect(selectedViews).toEqual([null]);
    expect(selectedFileIds).toEqual([]);
  });

  it('refolds the viewed files when a reload gave one a new id', async () => {
    const dependencies = createDependencies();
    const { store, folds } = dependencies;
    store.mark(ORDER);
    folds.folded(ORDER);
    const moved = { ...ORDER, id: 'git:2:src/order.ts' };
    store.reconcile([CART, moved, USER]);
    folds.reconcile(store.viewedFiles());
    const { ctx, executedCommands } = recordContext(CART, {
      files: [CART, moved, USER],
    });
    await toggleViewed(ctx, dependencies);

    expect(executedCommands).toEqual([APPLY_TO_ALL_MATCHING]);
    expect(folds.needsRefold()).toBe(false);
  });

  it('does not wait for Hunk while no fold was lost', async () => {
    const dependencies = createDependencies();
    let checks = 0;
    const { ctx, executedCommands } = recordContext(CART);
    await toggleViewed(ctx, {
      ...dependencies,
      waitUntil: (check) => {
        checks += 1;
        return Promise.resolve(check());
      },
    });

    expect(checks).toBe(0);
    expect(executedCommands).toEqual([]);
  });

  it('moves on when Hunk does not enable the refold', async () => {
    const dependencies = createDependencies();
    const { store, folds } = dependencies;
    store.mark(ORDER);
    folds.folded(ORDER);
    const moved = { ...ORDER, id: 'git:2:src/order.ts' };
    store.reconcile([CART, moved, USER]);
    folds.reconcile(store.viewedFiles());
    const { ctx, executedCommands, selectedFileIds } = recordContext(CART, {
      files: [CART, moved, USER],
      isApplyEnabled: false,
    });
    await toggleViewed(ctx, dependencies);

    expect(executedCommands).toEqual([]);
    expect(selectedFileIds).toEqual(['git:2:src/user.ts']);
    expect(folds.needsRefold()).toBe(false);
  });

  it('announces every mark and unmark', async () => {
    const dependencies = createDependencies();
    dependencies.store.reconcile([CART, ORDER, USER]);
    const { ctx } = recordContext(CART);
    await toggleViewed(ctx, dependencies);
    await toggleViewed(ctx, dependencies);

    expect(dependencies.announcements).toEqual([1, 0]);
  });

  it('shows the progress after each toggle', async () => {
    const dependencies = createDependencies();
    dependencies.store.reconcile([CART, ORDER, USER]);
    const { ctx, statusItems } = recordContext(CART);
    await toggleViewed(ctx, dependencies);
    await toggleViewed(ctx, dependencies);

    expect(statusItems.map((item) => item.spans[0]?.text)).toEqual([
      '1 of 3 files viewed',
      '0 of 3 files viewed',
    ]);
  });

  it('tells the user when no file is selected', async () => {
    const dependencies = createDependencies();
    const { ctx, selectedViews, notices } = recordContext(null);
    await toggleViewed(ctx, dependencies);

    expect(notices).toEqual(['Select a file to mark it viewed']);
    expect(selectedViews).toEqual([]);
  });
});
