import type {
  ExtensionStatusItem,
  ExtensionStatusLineControls,
} from 'hunkdiff/extension';
import { describe, expect, it } from 'vitest';

import showProgress from './showProgress.ts';

const recordStatusLine = (): {
  statusLine: ExtensionStatusLineControls;
  set: ExtensionStatusItem[];
  cleared: string[];
} => {
  const set: ExtensionStatusItem[] = [];
  const cleared: string[] = [];
  return {
    set,
    cleared,
    statusLine: {
      set: (item) => {
        set.push(item);
      },
      clear: (id) => {
        cleared.push(id);
      },
    },
  };
};

describe('showProgress', () => {
  it('shows the viewed files at the right of the status line', () => {
    const { statusLine, set } = recordStatusLine();
    showProgress(statusLine, { viewed: 3, total: 12 });

    expect(set).toEqual([
      {
        id: 'progress',
        spans: [{ text: '3 of 12 files viewed', tone: 'accent' }],
        alignment: 'right',
      },
    ]);
  });

  it('mutes the text while no file is viewed', () => {
    const { statusLine, set } = recordStatusLine();
    showProgress(statusLine, { viewed: 0, total: 5 });

    expect(set[0]?.spans).toEqual([
      { text: '0 of 5 files viewed', tone: 'muted' },
    ]);
  });

  it('says file for a review of one file', () => {
    const { statusLine, set } = recordStatusLine();
    showProgress(statusLine, { viewed: 1, total: 1 });

    expect(set[0]?.spans[0]?.text).toBe('1 of 1 file viewed');
  });

  it('clears the item for an empty review', () => {
    const { statusLine, set, cleared } = recordStatusLine();
    showProgress(statusLine, { viewed: 0, total: 0 });

    expect(set).toEqual([]);
    expect(cleared).toEqual(['progress']);
  });
});
