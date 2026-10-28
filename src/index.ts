import type { HunkExtensionAPI } from 'hunkdiff/extension';

/**
 * Registers hunk-viewed with Hunk.
 *
 * @param _hunk - The Hunk extension API.
 */
const viewedExtension = (_hunk: HunkExtensionAPI): void => {
  /** The scaffold only loads; the next pull requests register the commands. */
};

export default viewedExtension;
