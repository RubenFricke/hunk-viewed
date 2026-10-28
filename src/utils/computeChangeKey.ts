import { createHash } from 'node:crypto';

/** The line numbers at the start of a hunk header, without the section text. */
const HUNK_LINE_NUMBERS = /^@@ -\d+(?:,\d+)? \+\d+(?:,\d+)? @@/;

/**
 * A viewed mark stores this key and expires when it differs, like the Viewed
 * checkbox on GitHub. The key covers the hunks only: Git's header lines before
 * the first hunk and the line numbers of each `@@` line are left out, so a mark
 * stays when the same changes only move up or down in the file. A patch without
 * hunks, such as a binary file, is keyed whole: its `index` line is then the
 * only sign that the file changed.
 */
const computeChangeKey = (patch: string): string => {
  const lines = patch.split('\n');
  const firstHunk = lines.findIndex((line) => line.startsWith('@@'));
  const keyedLines =
    firstHunk < 0
      ? lines
      : lines
          .slice(firstHunk)
          .map((line) => line.replace(HUNK_LINE_NUMBERS, '@@'));
  return createHash('sha256').update(keyedLines.join('\n')).digest('hex');
};

export default computeChangeKey;
