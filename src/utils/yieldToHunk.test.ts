import { describe, expect, it } from 'vitest';

import yieldToHunk from './yieldToHunk.ts';

describe('yieldToHunk', () => {
  it('resolves after the microtasks that were queued before it', async () => {
    const order: string[] = [];
    const yielded = yieldToHunk().then(() => {
      order.push('hunk');
    });
    await Promise.resolve().then(() => {
      order.push('microtask');
    });
    await yielded;

    expect(order).toEqual(['microtask', 'hunk']);
  });
});
