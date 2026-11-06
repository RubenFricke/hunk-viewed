import type {
  ExtensionCommandContext,
  ExtensionCommandHandler,
  ExtensionDiffFile,
  ExtensionEventContext,
  ExtensionEventHandler,
  ExtensionEventName,
  ExtensionEventPayloads,
  ExtensionStatusItem,
  ExtensionStatusLineControls,
  HunkExtensionAPI,
} from 'hunkdiff/extension';
import { describe, expect, it } from 'vitest';

import viewedExtension from './index.ts';
import fakeDiffFile from '../test/fakeDiffFile.ts';
import recordCommandContext from '../test/recordCommandContext.ts';

const FILE = fakeDiffFile({
  patch: '@@ -1,1 +1,1 @@\n-before\n+after',
});
const OTHER = fakeDiffFile({ id: 'git:1:other.ts', path: 'other.ts' });
const BINARY = fakeDiffFile({
  id: 'git:0:image.bin',
  path: 'image.bin',
  patch: 'Binary files a/image.bin and b/image.bin differ',
});

/** Only the host boundary is faked; the factory, commands and store are real. */
const loadExtension = (config: Record<string, unknown> = {}) => {
  const handlers = new Map<ExtensionEventName, unknown>();
  const commands = new Map<string, ExtensionCommandHandler>();
  const items = new Map<string, ExtensionStatusItem>();
  const statusLine: ExtensionStatusLineControls = {
    set: (item) => {
      items.set(item.id, item);
    },
    clear: (id) => {
      items.delete(id);
    },
  };
  const api = {
    config,
    on: (name, handler) => {
      handlers.set(name, handler);
    },
    registerCommand: (command, handler) => {
      commands.set(command.id, handler);
    },
    registerFileView: () => undefined,
    registerLineHighlighter: () => undefined,
    events: { on: () => undefined, emit: () => undefined },
  } satisfies Pick<
    HunkExtensionAPI,
    | 'config'
    | 'on'
    | 'registerCommand'
    | 'registerFileView'
    | 'registerLineHighlighter'
    | 'events'
  >;
  // The factory only uses the capabilities implemented by this host fixture.
  viewedExtension(api as HunkExtensionAPI);

  const emit = async <Name extends ExtensionEventName>(
    name: Name,
    payload: ExtensionEventPayloads[Name],
  ): Promise<void> => {
    const handler = handlers.get(name) as ExtensionEventHandler<Name>;
    await handler(payload, {
      cwd: '/fixture',
      statusLine,
      notify: () => undefined,
    } as ExtensionEventContext);
  };
  const load = async (
    files: readonly ExtensionDiffFile[],
    reload = false,
  ): Promise<void> => {
    if (reload) {
      await emit('session_reload', { changeset: { files }, reason: 'manual' });
    } else {
      await emit('changeset_loaded', { changeset: { files } });
    }
  };
  const select = (fileId: string | null): Promise<void> =>
    emit('selection_changed', { fileId, hunkIndex: fileId ? 0 : null });
  const toggle = async (
    file: ExtensionDiffFile,
    files: readonly ExtensionDiffFile[],
    command = 'toggleFile',
    hunkIndex = 0,
  ): Promise<void> => {
    const recorded = recordCommandContext(file, { files, hunkIndex });
    const handler = commands.get(command);
    if (!handler) {
      throw new Error(`Missing command: ${command}`);
    }
    await handler({ ...recorded.ctx, statusLine } as ExtensionCommandContext);
  };
  return { items, load, select, toggle };
};

describe('viewed status through the extension', () => {
  it('shows a viewed mark without waiting for proof that the file folded', async () => {
    const host = loadExtension();
    await host.load([FILE]);
    await host.toggle(FILE, [FILE]);

    expect(host.items.get('viewed')?.spans[0]?.text).toBe('✓ Viewed');
    expect(host.items.get('progress')?.spans[0]?.text).toBe(
      '1 of 1 file viewed',
    );
  });

  it('updates the indication when navigation settles on another file', async () => {
    const host = loadExtension();
    await host.load([FILE, OTHER]);
    await host.toggle(FILE, [FILE, OTHER]);
    await host.select(OTHER.id);
    expect(host.items.has('viewed')).toBe(false);

    await host.select(FILE.id);
    expect(host.items.get('viewed')?.spans[0]?.text).toBe('✓ Viewed');
  });

  it('clears a displayed mark when the file is unmarked', async () => {
    const host = loadExtension();
    await host.load([FILE]);
    await host.toggle(FILE, [FILE]);
    expect(host.items.has('viewed')).toBe(true);

    await host.toggle(FILE, [FILE]);
    expect(host.items.has('viewed')).toBe(false);
  });

  it('clears a displayed mark when no file is selected', async () => {
    const host = loadExtension();
    await host.load([FILE]);
    await host.toggle(FILE, [FILE]);
    expect(host.items.has('viewed')).toBe(true);

    await host.select(null);
    expect(host.items.has('viewed')).toBe(false);
  });

  it('shows a file mark even when hunk progress is disabled', async () => {
    const host = loadExtension({ hunk_progress: false });
    await host.load([FILE]);
    await host.toggle(FILE, [FILE]);
    await host.select(FILE.id);

    expect(host.items.get('viewed')?.spans[0]?.text).toBe('✓ Viewed');
    expect(host.items.has('hunks')).toBe(false);
  });

  it('shows a viewed mark for a file without hunks', async () => {
    const host = loadExtension();
    await host.load([BINARY]);
    await host.toggle(BINARY, [BINARY], 'toggleHunk');

    expect(host.items.get('viewed')?.spans[0]?.text).toBe('✓ Viewed');
  });

  it('replaces partial hunk progress with a file mark after the last hunk', async () => {
    const file = fakeDiffFile({
      patch: `${FILE.patch}\n@@ -20,1 +20,1 @@\n-old\n+new`,
    });
    const host = loadExtension();
    await host.load([file]);
    await host.toggle(file, [file], 'toggleHunk', 0);
    expect(host.items.get('hunks')?.spans[0]?.text).toBe('1 of 2 hunks viewed');
    expect(host.items.has('viewed')).toBe(false);

    await host.toggle(file, [file], 'toggleHunk', 1);
    expect(host.items.get('viewed')?.spans[0]?.text).toBe('✓ Viewed');
    expect(host.items.has('hunks')).toBe(false);
  });

  it('restores a retained mark after reload renumbers the selected file', async () => {
    const host = loadExtension();
    await host.load([FILE]);
    await host.toggle(FILE, [FILE]);
    const moved = { ...FILE, id: 'git:1:src/cart.ts' };
    await host.load([OTHER, moved], true);
    expect(host.items.has('viewed')).toBe(false);

    await host.select(moved.id);
    expect(host.items.get('viewed')?.spans[0]?.text).toBe('✓ Viewed');
  });

  it('drops the indication when reload changes a viewed patch', async () => {
    const host = loadExtension();
    await host.load([FILE]);
    await host.toggle(FILE, [FILE]);
    expect(host.items.has('viewed')).toBe(true);

    const changed = { ...FILE, patch: `${FILE.patch}\n+another line` };
    await host.load([changed], true);
    await host.select(changed.id);
    expect(host.items.has('viewed')).toBe(false);
  });

  it('clears the indication when reload removes every file', async () => {
    const host = loadExtension();
    await host.load([FILE]);
    await host.toggle(FILE, [FILE]);
    expect(host.items.has('viewed')).toBe(true);

    await host.load([], true);
    await host.select(null);
    expect(host.items.size).toBe(0);
  });
});
