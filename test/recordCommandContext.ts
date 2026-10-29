import type {
  ExtensionDiffFile,
  ExtensionStatusItem,
  ExtensionStatusLineControls,
} from 'hunkdiff/extension';

const APPLY_TO_ALL_MATCHING = 'hunk.view.applyFilePresentationToAllMatching';

interface RecordOptions {
  readonly files: readonly ExtensionDiffFile[];
  readonly hunkIndex?: number | null;
  readonly isApplyEnabled?: boolean;
  readonly applyThrows?: boolean;
}

interface RecordedCommandContext {
  readonly selectedViews: (string | null)[];
  readonly selectedFileIds: string[];
  readonly selectedHunks: string[];
  readonly executedCommands: string[];
  readonly refreshedFileIds: string[];
  readonly statusItems: ExtensionStatusItem[];
  readonly notices: string[];
  readonly ctx: {
    readonly selection: {
      readonly file: ExtensionDiffFile | null;
      readonly files: readonly ExtensionDiffFile[];
      readonly hunkIndex: number | null;
    };
    readonly fileViews: { select: (viewId: string | null) => void };
    readonly navigation: {
      selectFile: (fileId: string) => void;
      selectHunk: (fileId: string, hunkIndex: number) => void;
    };
    readonly commands: {
      isEnabled: (commandId: string) => boolean;
      execute: (commandId: string) => boolean;
    };
    readonly highlights: {
      refresh: (highlighterId: string, options?: { fileId?: string }) => void;
    };
    readonly statusLine: ExtensionStatusLineControls;
    readonly notify: (message: string) => void;
  };
}

/** A fake command context that records what a command did to Hunk. */
const recordCommandContext = (
  file: ExtensionDiffFile | null,
  {
    files,
    hunkIndex = null,
    isApplyEnabled = true,
    applyThrows = false,
  }: RecordOptions,
): RecordedCommandContext => {
  const selectedViews: (string | null)[] = [];
  const selectedFileIds: string[] = [];
  const selectedHunks: string[] = [];
  const executedCommands: string[] = [];
  const refreshedFileIds: string[] = [];
  const statusItems: ExtensionStatusItem[] = [];
  const notices: string[] = [];
  return {
    selectedViews,
    selectedFileIds,
    selectedHunks,
    executedCommands,
    refreshedFileIds,
    statusItems,
    notices,
    ctx: {
      selection: { file, files, hunkIndex },
      fileViews: {
        select: (viewId) => {
          selectedViews.push(viewId);
        },
      },
      navigation: {
        selectFile: (fileId) => {
          selectedFileIds.push(fileId);
        },
        selectHunk: (fileId, index) => {
          selectedHunks.push(`${fileId}#${String(index)}`);
        },
      },
      commands: {
        isEnabled: (commandId) =>
          commandId === APPLY_TO_ALL_MATCHING && isApplyEnabled,
        execute: (commandId) => {
          if (applyThrows) {
            throw new Error('Hunk is reloading');
          }
          executedCommands.push(commandId);
          return true;
        },
      },
      highlights: {
        refresh: (_highlighterId, options) => {
          refreshedFileIds.push(options?.fileId ?? '*');
        },
      },
      statusLine: {
        set: (item) => {
          statusItems.push(item);
        },
        clear: () => undefined,
      },
      notify: (message) => {
        notices.push(message);
      },
    },
  };
};

export default recordCommandContext;
