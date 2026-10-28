import type {
  ExtensionDiffFile,
  ExtensionStatusItem,
} from 'hunkdiff/extension';
import { describe, expect, it } from 'vitest';

import createViewedStore from './createViewedStore.ts';
import toggleViewed from './toggleViewed.ts';
import fakeDiffFile from '../test/fakeDiffFile.ts';

const CART = fakeDiffFile({
  path: 'src/cart.ts',
  patch: '@@ -1,1 +1,1 @@\n-return 1;\n+return 2;',
});
const ORDER = fakeDiffFile({
  path: 'src/order.ts',
  patch: '@@ -4,1 +4,1 @@\n-return 1;\n+return 2;',
});

const recordContext = (
  file: ExtensionDiffFile | null,
): {
  ctx: Parameters<typeof toggleViewed>[0];
  selectedViews: (string | null)[];
  statusItems: ExtensionStatusItem[];
  notices: string[];
} => {
  const selectedViews: (string | null)[] = [];
  const statusItems: ExtensionStatusItem[] = [];
  const notices: string[] = [];
  return {
    selectedViews,
    statusItems,
    notices,
    ctx: {
      selection: { file },
      fileViews: {
        select: (viewId) => {
          selectedViews.push(viewId);
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

  it('unmarks a viewed file and returns it to the raw diff', () => {
    const store = createViewedStore();
    store.mark(CART);
    const { ctx, selectedViews } = recordContext(CART);
    toggleViewed(ctx, store);

    expect(store.isViewed(CART)).toBe(false);
    expect(selectedViews).toEqual([null]);
  });

  it('shows the progress after each toggle', () => {
    const store = createViewedStore();
    store.reconcile([CART, ORDER]);
    const { ctx, statusItems } = recordContext(CART);
    toggleViewed(ctx, store);
    toggleViewed(ctx, store);

    expect(statusItems.map((item) => item.spans[0]?.text)).toEqual([
      '1 of 2 files viewed',
      '0 of 2 files viewed',
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
