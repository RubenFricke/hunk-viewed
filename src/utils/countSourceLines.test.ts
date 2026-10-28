import { describe, expect, it } from 'vitest';

import countSourceLines from './countSourceLines.ts';

describe('countSourceLines', () => {
  it('counts no line after a trailing newline', () => {
    expect(countSourceLines('one\ntwo\n')).toBe(2);
  });

  it('counts a last line without a newline', () => {
    expect(countSourceLines('one\ntwo')).toBe(2);
  });

  it('counts an empty line before the trailing newline', () => {
    expect(countSourceLines('one\n\n')).toBe(2);
  });

  it('counts no lines in an empty document', () => {
    expect(countSourceLines('')).toBe(0);
  });
});
