import { createHash } from 'node:crypto';

/** One patch line a hunk covers, addressed the way line highlights are. */
interface HunkLine {
  readonly side: 'old' | 'new';
  readonly line: number;
  readonly length: number;
}

export interface ParsedHunk {
  /** A hash of the hunk's lines, with an occurrence suffix for duplicates. */
  readonly key: string;
  readonly lines: readonly HunkLine[];
}

const HUNK_HEADER = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/;

/**
 * Splits a patch into its hunks, in the order Hunk indexes them. A hunk's key
 * leaves out the line numbers of its `@@` line, so a mark on it stays when the
 * same change only moves up or down; two hunks with the same lines get
 * different keys, so a mark on one does not mark the other.
 */
const parseHunks = (patch: string): readonly ParsedHunk[] => {
  const hunks: { hash: string; lines: HunkLine[] }[] = [];
  let current: { body: string[]; lines: HunkLine[] } | null = null;
  let oldLine = 0;
  let newLine = 0;

  const finish = (): void => {
    if (current) {
      hunks.push({
        hash: createHash('sha256')
          .update(current.body.join('\n'))
          .digest('hex'),
        lines: current.lines,
      });
    }
  };

  for (const raw of patch.split('\n')) {
    const header = HUNK_HEADER.exec(raw);
    if (header) {
      finish();
      current = { body: [raw.replace(HUNK_HEADER, '@@')], lines: [] };
      oldLine = Number(header[1]);
      newLine = Number(header[2]);
      continue;
    }
    if (!current || raw === '' || raw.startsWith('\\')) {
      continue;
    }
    current.body.push(raw);
    const length = raw.length - 1;
    if (raw.startsWith('+')) {
      current.lines.push({ side: 'new', line: newLine, length });
      newLine += 1;
    } else if (raw.startsWith('-')) {
      current.lines.push({ side: 'old', line: oldLine, length });
      oldLine += 1;
    } else {
      current.lines.push({ side: 'new', line: newLine, length });
      oldLine += 1;
      newLine += 1;
    }
  }
  finish();

  const seen = new Map<string, number>();
  return hunks.map(({ hash, lines }) => {
    const occurrence = seen.get(hash) ?? 0;
    seen.set(hash, occurrence + 1);
    return { key: `${hash}#${String(occurrence)}`, lines };
  });
};

export default parseHunks;
