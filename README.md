# hunk-viewed

GitHub-style **Viewed** marks for [Hunk](https://hunk.dev): press `x` to mark a file viewed, fold it to one row, see your progress and move on to the next file.

<img alt="A Hunk review of five files. Each press of x folds the selected file to its header and one ✓ Viewed row, the status line counts up from 0 of 5 files viewed, and the selection moves to the next unviewed file. On a viewed file, x unfolds it again." src="https://github.com/RubenFricke/hunk-viewed/raw/assets/demo/hero.gif" width="940">

## Install

```bash
hunk extension install RubenFricke/hunk-viewed
```

Requires Hunk 0.24.0 or newer (extension API 31). Releases are tagged, so you can pin one: `hunk extension install RubenFricke/hunk-viewed@v0.1.0`.

## What you get

| Key | Command id                 | What it does                                                                                                                                                                     |
| --- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `x` | `hunk-viewed.toggleViewed` | Mark the selected file viewed, fold it to its header and one `✓ Viewed` row, and jump to the next file you have not viewed. On a viewed file: drop the mark, unfold it and stay. |

The status line shows `3 of 12 files viewed`. After the last file, `x` jumps back to the first unviewed file above. When every file is viewed it says `All 12 files viewed`; when only files hidden by the filter are left it says `No unviewed file is visible`.

## How it works

- **The fold keeps the review intact.** A viewed file shows its own header plus one `✓ Viewed` row. `j` and `k` still stop there, once per file, and the cards of your notes stay under it.
- **The jump** takes the next unviewed file below the selection, and after the last one the first unviewed file above. Only files the filter shows take part.
- **Folds come back by themselves.** Hunk forgets the presentation of a file when a reload renumbers it, so every `x` brings every viewed file back in line with the marks. No separate command to fold again. That also means a viewed file you set back to the raw diff by hand folds again on the next `x`; drop its mark with `x` instead.
- **A mark holds a hash of the file's hunks.** A reload that changes the lines of a viewed file drops the mark, like GitHub does. Lines that merely moved keep it.
- **Other extensions can follow along.** Every mark, unmark and dropped mark sends `hunk-viewed:changed` on Hunk's event bus with `{ viewed: string[] }`, the paths of every viewed file in review order.

  ```ts
  hunk.events.on<{ viewed: string[] }>('hunk-viewed:changed', ({ viewed }) => {
    // viewed: ['src/cart.ts', 'src/order.ts']
  });
  ```

## Configuration

There are no settings. To put the command on another key, remap it in your Hunk config:

```toml
# ~/.config/hunk/config.toml
[keybindings]
"hunk-viewed.toggleViewed" = "V"
```

## What it reads and writes

Nothing. Marks live in memory for the session, the same way Hunk keeps its own review notes: no files, no network, no shell commands, and nothing to clean up. Quit Hunk and the marks are gone.

## Compatibility

hunk-viewed follows the newest Hunk release. CI tests every pull request, and every day, against the newest Hunk release and against the oldest Hunk that hunk-viewed supports. When a new Hunk release breaks something, the fix comes in a new hunk-viewed release.

Each release lists the Hunk it needs. When a release raises that minimum, its notes say which earlier release still works with an older Hunk. If your Hunk is too old, Hunk itself tells you at startup.

## Known limitations

- **Notes stay visible.** A viewed file with notes folds, but the note cards keep showing under the `✓ Viewed` row. Hunk has no way yet for a file view to summarize them.
- **Files without a source,** such as a submodule or a patch from stdin, fold too, but `j` and `k` skip them; `[`, `]`, `,` and `.` still reach them. For submodules, `git config diff.submodule diff` gives Hunk the lines it needs.
- **After a reload that adds or removes a file,** the viewed files after it show unfolded until the next `x`. Hunk keeps a file's presentation by its position in the list.

## Development

```bash
bun install
bun run check                                # typecheck, lint, format, knip, tests
hunk diff --extension /path/to/hunk-viewed   # try a checkout without installing
./demo/record.sh                             # re-record the README demo (needs vhs)
```
