/**
 * `hunk_progress = false` in `[extension.hunk-viewed]` hides the hunk count on
 * the status line. The table is untrusted, so anything but `false` keeps the
 * default.
 */
const readHunkProgressSetting = (config: Record<string, unknown>): boolean =>
  config.hunk_progress !== false;

export default readHunkProgressSetting;
