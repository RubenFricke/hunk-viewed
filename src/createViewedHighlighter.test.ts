import { describe, expect, it } from 'vitest';

import createViewedHighlighter from './createViewedHighlighter.ts';
import createViewedStore from './createViewedStore.ts';
import fakeDiffFile from '../test/fakeDiffFile.ts';

const USER = fakeDiffFile({
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
});

const highlight = (
  highlighter: ReturnType<typeof createViewedHighlighter>,
  file: typeof USER,
) =>
  highlighter.highlight({
    file,
    signal: new AbortController().signal,
    readDocument: () => Promise.resolve(null),
  });

describe('createViewedHighlighter', () => {
  it('dims every line of a viewed hunk', () => {
    const store = createViewedStore();
    store.markHunk(USER, 1);

    expect(highlight(createViewedHighlighter(store), USER)).toEqual([
      { side: 'old', line: 9, range: [0, 8], tone: 'dim' },
      { side: 'new', line: 9, range: [0, 12], tone: 'dim' },
    ]);
  });

  it('marks nothing while no hunk is viewed', () => {
    const store = createViewedStore();

    expect(highlight(createViewedHighlighter(store), USER)).toBeNull();
  });

  it('marks nothing on a viewed file, which is folded', () => {
    const store = createViewedStore();
    store.markHunk(USER, 0);
    store.mark(USER);

    expect(highlight(createViewedHighlighter(store), USER)).toBeNull();
  });
});
