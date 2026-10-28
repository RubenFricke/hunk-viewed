import type {
  ExtensionDiffFile,
  ExtensionStatusItem,
} from 'hunkdiff/extension';
import { describe, expect, it } from 'vitest';

import createViewedStore from './createViewedStore.ts';
import toggleViewed from './toggleViewed.ts';
import fakeDiffFile from '../test/fakeDiffFile.ts';

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
  files: readonly ExtensionDiffFile[] = [CART, ORDER, USER],
): {
  ctx: Parameters<typeof toggleViewed>[0];
  selectedViews: (string | null)[];
  selectedFileIds: string[];
  statusItems: ExtensionStatusItem[];
  notices: string[];
} => {
  const selectedViews: (string | null)[] = [];
  const selectedFileIds: string[] = [];
  const statusItems: ExtensionStatusItem[] = [];
  const notices: string[] = [];
  return {
    selectedViews,
    selectedFileIds,
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

describe('toggleViewed', () => {
  it('marks an unviewed file and folds it', () => {
    const store = createViewedStore();
    const { ctx, selectedViews } = recordContext(CART);
    toggleViewed(ctx, store);

    expect(store.isViewed(CART)).toBe(true);
    expect(selectedViews).toEqual(['viewed']);
  });

  it('jumps to the next unviewed file after marking', () => {
    const store = createViewedStore();
    store.mark(ORDER);
    const { ctx, selectedFileIds } = recordContext(CART);
    toggleViewed(ctx, store);

    expect(selectedFileIds).toEqual(['git:2:src/user.ts']);
  });

  it('jumps back to an earlier unviewed file after the last file', () => {
    const store = createViewedStore();
    store.mark(ORDER);
    const { ctx, selectedFileIds } = recordContext(USER);
    toggleViewed(ctx, store);

    expect(selectedFileIds).toEqual(['git:0:src/cart.ts']);
  });

  it('stays and says so when every file is viewed', () => {
    const store = createViewedStore();
    store.reconcile([CART, ORDER, USER]);
    store.mark(CART);
    store.mark(ORDER);
    const { ctx, selectedFileIds, notices } = recordContext(USER);
    toggleViewed(ctx, store);

    expect(selectedFileIds).toEqual([]);
    expect(notices).toEqual(['All 3 files viewed']);
  });

  it('says so when only hidden files are still unviewed', () => {
    const store = createViewedStore();
    store.reconcile([CART, ORDER, USER]);
    const { ctx, selectedFileIds, notices } = recordContext(CART, [CART]);
    toggleViewed(ctx, store);

    expect(selectedFileIds).toEqual([]);
    expect(notices).toEqual(['No unviewed file is visible']);
  });

  it('unmarks a viewed file, returns it to the raw diff and stays', () => {
    const store = createViewedStore();
    store.mark(CART);
    const { ctx, selectedViews, selectedFileIds } = recordContext(CART);
    toggleViewed(ctx, store);

    expect(store.isViewed(CART)).toBe(false);
    expect(selectedViews).toEqual([null]);
    expect(selectedFileIds).toEqual([]);
  });

  it('shows the progress after each toggle', () => {
    const store = createViewedStore();
    store.reconcile([CART, ORDER, USER]);
    const { ctx, statusItems } = recordContext(CART);
    toggleViewed(ctx, store);
    toggleViewed(ctx, store);

    expect(statusItems.map((item) => item.spans[0]?.text)).toEqual([
      '1 of 3 files viewed',
      '0 of 3 files viewed',
    ]);
  });

  it('tells the user when no file is selected', () => {
    const store = createViewedStore();
    const { ctx, selectedViews, notices } = recordContext(null);
    toggleViewed(ctx, store);

    expect(notices).toEqual(['Select a file to mark it viewed']);
    expect(selectedViews).toEqual([]);
  });
});
