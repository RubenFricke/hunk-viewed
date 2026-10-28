import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { HUNK_EXTENSION_API_VERSION } from 'hunkdiff/extension';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const HUNK_PACKAGE = join(PACKAGE_ROOT, 'node_modules', 'hunkdiff');
const HUNK_TIMEOUT_MS = 15_000;

/**
 * An unknown top-level command makes Hunk load every extension and then stop,
 * without a terminal. Neither message below is a public contract of Hunk, so
 * the tests also check that the probe reached the unknown command.
 */
const PROBE_COMMAND = 'zz-load-probe';
const UNKNOWN_COMMAND = `Unknown command: ${PROBE_COMMAND}`;
const LOAD_FAILED = 'One or more extensions failed to load';

const findHunkCli = async (): Promise<string> => {
  const manifest = JSON.parse(
    await readFile(join(HUNK_PACKAGE, 'package.json'), 'utf8'),
  ) as { bin: string | Record<string, string> };
  const bin =
    typeof manifest.bin === 'string' ? manifest.bin : manifest.bin.hunk;
  if (!bin) {
    throw new Error('The hunkdiff package has no hunk binary.');
  }
  return join(HUNK_PACKAGE, bin);
};

const probeExtension = async (
  workDir: string,
  extensionDir: string,
): Promise<string> => {
  const cli = await findHunkCli();
  const child = spawn(
    process.execPath,
    [cli, '--extension', extensionDir, PROBE_COMMAND],
    {
      cwd: workDir,
      env: {
        ...process.env,
        XDG_CONFIG_HOME: join(workDir, 'config'),
        XDG_STATE_HOME: join(workDir, 'state'),
        HUNK_MCP_DISABLE: '1',
        HUNK_DISABLE_UPDATE_NOTICE: '1',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );

  let output = '';
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk: string) => {
    output += chunk;
  });
  child.stderr.on('data', (chunk: string) => {
    output += chunk;
  });

  await new Promise<void>((resolveExit, rejectExit) => {
    const timer = setTimeout(() => {
      child.kill();
      rejectExit(new Error(`Hunk did not stop.\n${output}`));
    }, HUNK_TIMEOUT_MS);
    child.on('error', (error) => {
      clearTimeout(timer);
      rejectExit(error);
    });
    /** Hunk exits with 1 for the unknown command, also when all loads. */
    child.on('close', () => {
      clearTimeout(timer);
      resolveExit();
    });
  });
  return output;
};

describe('hunk-viewed in Hunk', () => {
  let workDir = '';

  beforeEach(async () => {
    workDir = await mkdtemp(join(tmpdir(), 'hunk-viewed-load-'));
  });

  afterEach(async () => {
    await rm(workDir, { recursive: true, force: true });
  });

  it(
    'loads in the pinned Hunk version without extension errors',
    async () => {
      const output = await probeExtension(workDir, PACKAGE_ROOT);

      expect(output).toContain(UNKNOWN_COMMAND);
      expect(output).not.toContain(LOAD_FAILED);
    },
    HUNK_TIMEOUT_MS * 2,
  );

  it(
    'reports an extension that throws while it loads',
    async () => {
      const brokenDir = join(workDir, 'broken-extension');
      await mkdir(brokenDir);
      await writeFile(
        join(brokenDir, 'package.json'),
        JSON.stringify({ hunk: { extensions: ['./index.ts'] } }),
      );
      await writeFile(
        join(brokenDir, 'index.ts'),
        "export default () => { throw new Error('broken'); };\n",
      );

      const output = await probeExtension(workDir, brokenDir);

      expect(output).toContain(UNKNOWN_COMMAND);
      expect(output).toContain(LOAD_FAILED);
    },
    HUNK_TIMEOUT_MS * 2,
  );

  it('pins a Hunk whose extension API covers the manifest', async () => {
    const manifest = JSON.parse(
      await readFile(join(PACKAGE_ROOT, 'package.json'), 'utf8'),
    ) as { hunk: { apiVersion: number } };

    expect(HUNK_EXTENSION_API_VERSION).toBeGreaterThanOrEqual(
      manifest.hunk.apiVersion,
    );
  });
});
