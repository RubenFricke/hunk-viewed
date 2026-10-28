import { describe, expect, it } from 'vitest';

import computeChangeKey from './computeChangeKey.ts';

const HEADER = [
  'diff --git a/guide.md b/guide.md',
  'index 1111111..2222222 100644',
  '--- a/guide.md',
  '+++ b/guide.md',
];

const HUNK = [
  '@@ -1,3 +1,3 @@ intro',
  ' line 1',
  '-line 2',
  '+line 2 changed',
  ' line 3',
];

describe('computeChangeKey', () => {
  it('keeps the key when only the hunk line numbers move', () => {
    const moved = [...HEADER, '@@ -6,3 +6,3 @@ intro', ...HUNK.slice(1)].join(
      '\n',
    );

    expect(computeChangeKey(moved)).toBe(
      computeChangeKey([...HEADER, ...HUNK].join('\n')),
    );
  });

  it('keeps the key when only the Git header lines differ', () => {
    const otherHeader = [
      'diff --git a/guide.md b/guide.md',
      'index 3333333..4444444 100644',
      '--- a/guide.md',
      '+++ b/guide.md',
    ];

    expect(computeChangeKey([...otherHeader, ...HUNK].join('\n'))).toBe(
      computeChangeKey([...HEADER, ...HUNK].join('\n')),
    );
  });

  it('changes the key when a changed line differs', () => {
    const edited = HUNK.map((line) =>
      line === '+line 2 changed' ? '+line 2 changed again' : line,
    );

    expect(computeChangeKey([...HEADER, ...edited].join('\n'))).not.toBe(
      computeChangeKey([...HEADER, ...HUNK].join('\n')),
    );
  });

  it('changes the key when the section text of a hunk header differs', () => {
    const renamed = ['@@ -1,3 +1,3 @@ outro', ...HUNK.slice(1)];

    expect(computeChangeKey([...HEADER, ...renamed].join('\n'))).not.toBe(
      computeChangeKey([...HEADER, ...HUNK].join('\n')),
    );
  });

  it('keys a patch without hunks whole, so a new binary version differs', () => {
    const binary = (index: string): string =>
      [
        'diff --git a/logo.bin b/logo.bin',
        `index ${index} 100644`,
        'Binary files a/logo.bin and b/logo.bin differ',
      ].join('\n');

    expect(computeChangeKey(binary('1111111..2222222'))).not.toBe(
      computeChangeKey(binary('1111111..3333333')),
    );
  });
});
