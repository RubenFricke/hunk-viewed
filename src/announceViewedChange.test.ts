import { describe, expect, it } from 'vitest';

import announceViewedChange from './announceViewedChange.ts';

describe('announceViewedChange', () => {
  it('sends the paths of every viewed file', () => {
    const emitted: { event: string; payload: unknown }[] = [];
    announceViewedChange(
      {
        emit: (event, payload) => {
          emitted.push({ event, payload });
        },
      },
      {
        viewedFiles: () => [
          { id: 'git:0:src/cart.ts', path: 'src/cart.ts', patch: '' },
          { id: 'git:2:src/user.ts', path: 'src/user.ts', patch: '' },
        ],
      },
    );

    expect(emitted).toEqual([
      {
        event: 'hunk-viewed:changed',
        payload: { viewed: ['src/cart.ts', 'src/user.ts'] },
      },
    ]);
  });
});
