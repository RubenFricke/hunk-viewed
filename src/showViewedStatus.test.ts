import type { ExtensionStatusItem } from 'hunkdiff/extension';
import { describe, expect, it } from 'vitest';

import showViewedStatus from './showViewedStatus.ts';

const recordStatusLine = (): {
  items: Map<string, ExtensionStatusItem>;
  statusLine: Parameters<typeof showViewedStatus>[0];
} => {
  const items = new Map<string, ExtensionStatusItem>();
  return {
    items,
    statusLine: {
      set: (item) => {
        items.set(item.id, item);
      },
      clear: (id) => {
        items.delete(id);
      },
    },
  };
};

describe('showViewedStatus', () => {
  it('identifies the selected viewed file without inspecting its presentation', () => {
    const { items, statusLine } = recordStatusLine();
    showViewedStatus(statusLine, true);

    expect([...items.values()]).toEqual([
      {
        id: 'viewed',
        spans: [{ text: '✓ Viewed', tone: 'accent' }],
        alignment: 'left',
      },
    ]);
  });

  it('removes the previous viewed indication without clearing other items', () => {
    const { items, statusLine } = recordStatusLine();
    const progress: ExtensionStatusItem = {
      id: 'progress',
      spans: [{ text: '1 of 2 files viewed' }],
    };
    statusLine.set(progress);
    statusLine.set({ id: 'viewed', spans: [{ text: '✓ Viewed' }] });
    showViewedStatus(statusLine, false);

    expect([...items.values()]).toEqual([progress]);
  });
});
