import type { ExtensionEventBus } from 'hunkdiff/extension';

import type { ViewedStore } from './createViewedStore.ts';

/** Other extensions listen for this name, so it must not change. */
const VIEWED_CHANGED_EVENT = 'hunk-viewed:changed';

interface ViewedChangedPayload {
  /** The paths of every viewed file, in the order of the review. */
  readonly viewed: readonly string[];
}

/**
 * Sends the whole list, not only the file that changed. Hunk's event bus keeps
 * no history, so a listener that starts late or misses an event still gets the
 * full state with the next one.
 */
const announceViewedChange = (
  events: Pick<ExtensionEventBus, 'emit'>,
  store: Pick<ViewedStore, 'viewedFiles'>,
): void => {
  events.emit<ViewedChangedPayload>(VIEWED_CHANGED_EVENT, {
    viewed: store.viewedFiles().map((file) => file.path),
  });
};

export default announceViewedChange;
