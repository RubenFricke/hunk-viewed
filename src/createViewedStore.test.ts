import { describe, expect, it } from 'vitest';

import createViewedStore from './createViewedStore.ts';

const CART = {
  id: 'git:0:src/cart.ts',
  path: 'src/cart.ts',
  patch: '@@ -1,1 +1,1 @@\n-return 1;\n+return 2;',
};
const ORDER = {
  id: 'git:1:src/order.ts',
  path: 'src/order.ts',
  patch: '@@ -4,1 +4,1 @@\n-return 1;\n+return 2;',
};

describe('createViewedStore', () => {
  it('reports a marked file as viewed', () => {
    const store = createViewedStore();
    store.mark(CART);

    expect(store.isViewed(CART)).toBe(true);
    expect(store.isViewed(ORDER)).toBe(false);
  });

  it('reports an unmarked file as not viewed', () => {
    const store = createViewedStore();
    store.mark(CART);
    store.unmark(CART);

    expect(store.isViewed(CART)).toBe(false);
  });

  it('keeps a mark when the same changes move to other line numbers', () => {
    const store = createViewedStore();
    store.mark(CART);
    const moved = { ...CART, patch: '@@ -9,1 +9,1 @@\n-return 1;\n+return 2;' };
    store.reconcile([moved, ORDER]);

    expect(store.isViewed(moved)).toBe(true);
  });

  it('drops a mark when the changes in the file differ', () => {
    const store = createViewedStore();
    store.mark(CART);
    const edited = {
      ...CART,
      patch: '@@ -1,1 +1,1 @@\n-return 1;\n+return 3;',
    };

    expect(store.isViewed(edited)).toBe(false);
    store.reconcile([edited]);
    expect(store.isViewed(CART)).toBe(false);
  });

  it('drops a mark when the file left the review', () => {
    const store = createViewedStore();
    store.mark(CART);
    store.reconcile([ORDER]);
    store.reconcile([CART, ORDER]);

    expect(store.isViewed(CART)).toBe(false);
  });

  it('counts the viewed files of the current review', () => {
    const store = createViewedStore();
    expect(store.progress()).toEqual({ viewed: 0, total: 0 });

    store.reconcile([CART, ORDER]);
    store.mark(ORDER);

    expect(store.progress()).toEqual({ viewed: 1, total: 2 });
  });

  it('lists the viewed files in the order of the review', () => {
    const store = createViewedStore();
    store.reconcile([CART, ORDER]);
    store.mark(ORDER);
    store.mark(CART);

    expect(store.viewedFiles()).toEqual([CART, ORDER]);
  });
});
