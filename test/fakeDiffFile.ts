import type { ExtensionDiffFile } from 'hunkdiff/extension';

/**
 * Builds a reviewed file as Hunk hands it to an extension.
 *
 * @param overrides - The fields a test cares about.
 * @returns The file, with plain values for every other field.
 */
const fakeDiffFile = (
  overrides: Partial<ExtensionDiffFile> = {},
): ExtensionDiffFile => ({
  id: 'git:0:src/cart.ts',
  path: 'src/cart.ts',
  patch: '',
  stats: { additions: 1, deletions: 1 },
  metadata: {},
  agent: null,
  ...overrides,
});

export default fakeDiffFile;
