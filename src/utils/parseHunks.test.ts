import { describe, expect, it } from 'vitest';

import parseHunks from './parseHunks.ts';

const PATCH = [
  'diff --git a/src/cart.ts b/src/cart.ts',
  '--- a/src/cart.ts',
  '+++ b/src/cart.ts',
  '@@ -1,3 +1,3 @@',
  ' const a = 1;',
  '-const b = 2;',
  '+const b = 20;',
  ' const c = 3;',
  '@@ -10,2 +10,3 @@ function tail() {',
  ' return a;',
  '+return b;',
  '\\ No newline at end of file',
].join('\n');

describe('parseHunks', () => {
  it('splits a patch into hunks with the lines each one covers', () => {
    const hunks = parseHunks(PATCH);

    expect(hunks).toHaveLength(2);
    expect(hunks[0]?.lines).toEqual([
      { side: 'new', line: 1, length: 12 },
      { side: 'old', line: 2, length: 12 },
      { side: 'new', line: 2, length: 13 },
      { side: 'new', line: 3, length: 12 },
    ]);
    expect(hunks[1]?.lines).toEqual([
      { side: 'new', line: 10, length: 9 },
      { side: 'new', line: 11, length: 9 },
    ]);
  });

  it('keeps a key when the hunk only moves to other line numbers', () => {
    const moved = PATCH.replace('@@ -1,3 +1,3 @@', '@@ -7,3 +7,3 @@');

    expect(parseHunks(moved)[0]?.key).toBe(parseHunks(PATCH)[0]?.key);
  });

  it('changes a key when a line in the hunk changes', () => {
    const edited = PATCH.replace('+const b = 20;', '+const b = 21;');

    expect(parseHunks(edited)[0]?.key).not.toBe(parseHunks(PATCH)[0]?.key);
  });

  it('changes a key when the final newline comes or goes', () => {
    const withNewline = PATCH.replace('\n\\ No newline at end of file', '');

    expect(parseHunks(withNewline)[1]?.key).not.toBe(parseHunks(PATCH)[1]?.key);
    expect(parseHunks(withNewline)[1]?.lines).toEqual(
      parseHunks(PATCH)[1]?.lines,
    );
  });

  it('gives two identical hunks different keys', () => {
    const twice = [
      '@@ -1,1 +1,1 @@',
      '-a',
      '+b',
      '@@ -9,1 +9,1 @@',
      '-a',
      '+b',
    ].join('\n');
    const [first, second] = parseHunks(twice);

    expect(first?.key.endsWith('#0')).toBe(true);
    expect(second?.key.endsWith('#1')).toBe(true);
    expect(first?.key).not.toBe(second?.key);
  });

  it('finds no hunks in a patch without them', () => {
    expect(parseHunks('Binary files a/logo.bin and b/logo.bin differ')).toEqual(
      [],
    );
  });
});
