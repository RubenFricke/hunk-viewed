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
const TWO_HUNKS = {
  id: 'git:2:src/user.ts',
  path: 'src/user.ts',
  patch: [
    '@@ -1,1 +1,1 @@',
    '-return 1;',
    '+return 2;',
    '@@ -9,1 +9,1 @@',
    '-greet();',
    '+greet(name);',
  ].join('\n'),
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

  it('reports no dropped marks when nothing changed', () => {
    const store = createViewedStore();
    store.mark(CART);

    expect(store.reconcile([CART, ORDER])).toEqual({
      changed: [],
      removed: [],
    });
  });

  it('reports a mark dropped because the changes differ', () => {
    const store = createViewedStore();
    store.mark(CART);
    const edited = {
      ...CART,
      patch: '@@ -1,1 +1,1 @@\n-return 1;\n+return 3;',
    };

    expect(store.reconcile([edited, ORDER])).toEqual({
      changed: ['src/cart.ts'],
      removed: [],
    });
  });

  it('reports a mark dropped because the file left the review', () => {
    const store = createViewedStore();
    store.mark(CART);

    expect(store.reconcile([ORDER])).toEqual({
      changed: [],
      removed: ['src/cart.ts'],
    });
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

  it('finds a file of the current review by id', () => {
    const store = createViewedStore();
    store.reconcile([CART, ORDER]);

    expect(store.fileById('git:1:src/order.ts')).toBe(ORDER);
    expect(store.fileById('git:9:src/gone.ts')).toBeNull();
  });

  it('parses the hunks of a file once per patch', () => {
    const store = createViewedStore();

    expect(store.hunksOf(TWO_HUNKS)).toHaveLength(2);
    expect(store.hunksOf(TWO_HUNKS)).toBe(store.hunksOf(TWO_HUNKS));
    expect(store.hunksOf({ ...TWO_HUNKS, patch: CART.patch })).toHaveLength(1);
  });

  it('marks and unmarks one hunk', () => {
    const store = createViewedStore();
    store.markHunk(TWO_HUNKS, 1);

    expect(store.isHunkViewed(TWO_HUNKS, 0)).toBe(false);
    expect(store.isHunkViewed(TWO_HUNKS, 1)).toBe(true);
    expect(store.hunkProgress(TWO_HUNKS)).toEqual({ viewed: 1, total: 2 });

    store.unmarkHunk(TWO_HUNKS, 1);
    expect(store.isHunkViewed(TWO_HUNKS, 1)).toBe(false);
  });

  it('counts every hunk of a viewed file as viewed', () => {
    const store = createViewedStore();
    store.mark(TWO_HUNKS);

    expect(store.isHunkViewed(TWO_HUNKS, 0)).toBe(true);
    expect(store.hunkProgress(TWO_HUNKS)).toEqual({ viewed: 2, total: 2 });
  });

  it('forgets the hunk marks of a file', () => {
    const store = createViewedStore();
    store.markHunk(TWO_HUNKS, 0);
    store.markHunk(TWO_HUNKS, 1);
    store.clearHunks(TWO_HUNKS);

    expect(store.hunkProgress(TWO_HUNKS)).toEqual({ viewed: 0, total: 2 });
  });

  it('keeps a hunk mark when the hunk moves and drops it when it changes', () => {
    const store = createViewedStore();
    store.markHunk(TWO_HUNKS, 0);
    const moved = {
      ...TWO_HUNKS,
      patch: TWO_HUNKS.patch.replace('@@ -1,1 +1,1 @@', '@@ -5,1 +5,1 @@'),
    };
    store.reconcile([moved]);
    expect(store.isHunkViewed(moved, 0)).toBe(true);

    const edited = {
      ...TWO_HUNKS,
      patch: TWO_HUNKS.patch.replace('+return 2;', '+return 3;'),
    };
    store.reconcile([edited]);
    expect(store.isHunkViewed(edited, 0)).toBe(false);
    expect(store.reconcile([edited])).toEqual({ changed: [], removed: [] });
  });

  it('drops the hunk marks of a file that left the review', () => {
    const store = createViewedStore();
    store.markHunk(TWO_HUNKS, 0);
    store.reconcile([CART]);
    store.reconcile([TWO_HUNKS]);

    expect(store.isHunkViewed(TWO_HUNKS, 0)).toBe(false);
  });
});
