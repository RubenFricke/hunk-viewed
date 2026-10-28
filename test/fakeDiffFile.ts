import type { ExtensionDiffFile } from 'hunkdiff/extension';

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
