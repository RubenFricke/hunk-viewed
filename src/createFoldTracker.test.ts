import { describe, expect, it } from 'vitest';

import createFoldTracker from './createFoldTracker.ts';

const CART = { id: 'git:0:src/cart.ts', path: 'src/cart.ts' };
const ORDER = { id: 'git:1:src/order.ts', path: 'src/order.ts' };

describe('createFoldTracker', () => {
  it('needs no refold while the folded files keep their ids', () => {
    const folds = createFoldTracker();
    folds.folded(CART);
    folds.reconcile([CART]);

    expect(folds.needsRefold()).toBe(false);
  });

  it('needs a refold when a reload gave a folded file a new id', () => {
    const folds = createFoldTracker();
    folds.folded(ORDER);
    folds.reconcile([{ ...ORDER, id: 'git:2:src/order.ts' }]);

    expect(folds.needsRefold()).toBe(true);
  });

  it('forgets a file that is no longer viewed', () => {
    const folds = createFoldTracker();
    folds.folded(ORDER);
    folds.reconcile([]);
    folds.reconcile([{ ...ORDER, id: 'git:2:src/order.ts' }]);

    expect(folds.needsRefold()).toBe(false);
  });

  it('forgets a file that was unfolded', () => {
    const folds = createFoldTracker();
    folds.folded(ORDER);
    folds.unfolded(ORDER);
    folds.reconcile([{ ...ORDER, id: 'git:2:src/order.ts' }]);

    expect(folds.needsRefold()).toBe(false);
  });

  it('takes the current ids after a refold', () => {
    const folds = createFoldTracker();
    folds.folded(ORDER);
    const moved = { ...ORDER, id: 'git:2:src/order.ts' };
    folds.reconcile([CART, moved]);
    folds.refolded([CART, moved]);
    folds.reconcile([CART, moved]);

    expect(folds.needsRefold()).toBe(false);
  });
});
