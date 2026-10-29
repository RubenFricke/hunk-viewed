import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';

import planRelease, {
  RELEASE_BUMPS,
  type ReleaseBump,
} from './utils/planRelease.ts';

const USAGE =
  'Usage: bun run scripts/release.ts --bump <patch|minor|major> [--dry-run]';

/**
 * Plans the next release from the tags and writes the version to package.json
 * unless this is a dry run. The commit, the tag and the GitHub release are the
 * workflow's job, so that they stay visible in one place.
 */
const release = (argv: readonly string[]): void => {
  const isBump = (value: string | undefined): value is ReleaseBump =>
    RELEASE_BUMPS.some((bump) => bump === value);
  const bumpIndex = argv.indexOf('--bump');
  const bump = bumpIndex === -1 ? undefined : argv[bumpIndex + 1];
  if (!isBump(bump)) {
    throw new Error(USAGE);
  }
  const isDryRun = argv.includes('--dry-run');

  const tags = execFileSync('git', ['tag', '--list', 'v*'], {
    encoding: 'utf8',
  })
    .split('\n')
    .filter((tag) => tag !== '');
  const manifestText = readFileSync('package.json', 'utf8');
  const manifest: unknown = JSON.parse(manifestText);
  if (
    typeof manifest !== 'object' ||
    manifest === null ||
    !('version' in manifest) ||
    typeof manifest.version !== 'string'
  ) {
    throw new Error('package.json has no version.');
  }
  const packageVersion = manifest.version;

  const plan = planRelease({ bump, packageVersion, tags });
  const after = plan.previousTag ? `after ${plan.previousTag}` : 'the first';
  console.log(`Next release: ${plan.tag} (${after}).`);

  const output = process.env.GITHUB_OUTPUT;
  if (output !== undefined) {
    appendFileSync(
      output,
      `version=${plan.version}\ntag=${plan.tag}\nprevious_tag=${plan.previousTag ?? ''}\n`,
    );
  }
  if (isDryRun) {
    console.log('Dry run: package.json stays as it is.');
    return;
  }

  /** A text replacement keeps the formatting of package.json intact. */
  const versionLine = `"version": "${packageVersion}"`;
  if (manifestText.split(versionLine).length !== 2) {
    throw new Error(`Expected exactly one ${versionLine} in package.json.`);
  }
  writeFileSync(
    'package.json',
    manifestText.replace(versionLine, `"version": "${plan.version}"`),
  );
  console.log(`package.json now says ${plan.version}.`);
};

try {
  release(process.argv.slice(2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
