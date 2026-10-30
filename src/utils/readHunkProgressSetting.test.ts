import { describe, expect, it } from 'vitest';

import readHunkProgressSetting from './readHunkProgressSetting.ts';

describe('readHunkProgressSetting', () => {
  it('shows the hunk count by default', () => {
    expect(readHunkProgressSetting({})).toBe(true);
  });

  it('hides the hunk count on false', () => {
    expect(readHunkProgressSetting({ hunk_progress: false })).toBe(false);
  });

  it('keeps the default on a value that is not a boolean', () => {
    expect(readHunkProgressSetting({ hunk_progress: 'no' })).toBe(true);
  });
});
