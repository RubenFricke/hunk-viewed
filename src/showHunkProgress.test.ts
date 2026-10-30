import type { ExtensionStatusItem } from 'hunkdiff/extension';
import { describe, expect, it } from 'vitest';

import showHunkProgress from './showHunkProgress.ts';

const recordStatusLine = (): {
  items: ExtensionStatusItem[];
  cleared: string[];
  statusLine: Parameters<typeof showHunkProgress>[0];
} => {
  const items: ExtensionStatusItem[] = [];
  const cleared: string[] = [];
  return {
    items,
    cleared,
    statusLine: {
      set: (item) => {
        items.push(item);
      },
      clear: (id) => {
        cleared.push(id);
      },
    },
  };
};

describe('showHunkProgress', () => {
  it('counts the hunks of a file that is partly viewed', () => {
    const { items, statusLine } = recordStatusLine();
    showHunkProgress(statusLine, { viewed: 1, total: 3 });

    expect(items).toEqual([
      {
        id: 'hunks',
        spans: [{ text: '1 of 3 hunks viewed', tone: 'accent' }],
        alignment: 'left',
        priority: -1,
      },
    ]);
  });

  it('says nothing for a file with no hunk viewed', () => {
    const { items, cleared, statusLine } = recordStatusLine();
    showHunkProgress(statusLine, { viewed: 0, total: 3 });

    expect(items).toEqual([]);
    expect(cleared).toEqual(['hunks']);
  });

  it('says nothing for a file with every hunk viewed', () => {
    const { items, cleared, statusLine } = recordStatusLine();
    showHunkProgress(statusLine, { viewed: 3, total: 3 });

    expect(items).toEqual([]);
    expect(cleared).toEqual(['hunks']);
  });

  it('says nothing without a file', () => {
    const { cleared, statusLine } = recordStatusLine();
    showHunkProgress(statusLine, null);

    expect(cleared).toEqual(['hunks']);
  });
});
