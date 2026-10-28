import { describe, expect, it } from 'vitest';

import waitFor from './waitFor.ts';

describe('waitFor', () => {
  it('resolves true as soon as the check passes', async () => {
    let checks = 0;
    const isReady = await waitFor(
      () => {
        checks += 1;
        return checks === 3;
      },
      { delayMs: 0 },
    );

    expect(isReady).toBe(true);
    expect(checks).toBe(3);
  });

  it('resolves false after the last try', async () => {
    let checks = 0;
    const isReady = await waitFor(
      () => {
        checks += 1;
        return false;
      },
      { tries: 4, delayMs: 0 },
    );

    expect(isReady).toBe(false);
    expect(checks).toBe(4);
  });
});
