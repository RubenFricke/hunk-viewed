import { describe, expect, it } from 'vitest';

import describeChangedFiles from './describeChangedFiles.ts';

describe('describeChangedFiles', () => {
  it('counts one file', () => {
    expect(describeChangedFiles(1)).toBe('1 file has changed since viewed');
  });

  it('counts more files', () => {
    expect(describeChangedFiles(3)).toBe('3 files have changed since viewed');
  });
});
