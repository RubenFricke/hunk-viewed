/**
 * Hunk draws a pending update in a React task that runs after the command
 * handler. A microtask runs before that task, and so does a `setImmediate`
 * queued from the handler, while a timer runs after it.
 */
const yieldToHunk = (): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, 0);
  });

export default yieldToHunk;
