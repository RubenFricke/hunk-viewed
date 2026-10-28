import type { ExtensionFileSide, ExtensionFileView } from 'hunkdiff/extension';

import type { ViewedStore } from './createViewedStore.ts';
import buildFoldedLayout from './utils/buildFoldedLayout.ts';
import collectSourceRanges from './utils/collectSourceRanges.ts';

export const VIEWED_VIEW_ID = 'viewed';

const SIDES = ['old', 'new'] as const satisfies readonly ExtensionFileSide[];

/**
 * Creates the file presentation that folds a viewed file to its header and one
 * `✓ Viewed` row.
 *
 * @param store - The viewed marks of the session.
 * @returns The file view to register with Hunk.
 */
const createViewedFileView = (
  store: Pick<ViewedStore, 'isViewed'>,
): ExtensionFileView => ({
  id: VIEWED_VIEW_ID,
  title: 'Viewed',
  matches: (file) => store.isViewed(file),
  layout: async (input) => {
    const { file } = input;
    /** A reload can drop the mark while Hunk still holds this view. */
    if (!store.isViewed(file)) {
      return null;
    }
    const hunks = file.hunks ?? [];
    if (hunks.length === 0) {
      return buildFoldedLayout(0, []);
    }
    const documents = await Promise.all(
      SIDES.map((side) => input.readDocument(side)),
    );
    const readableSides = new Set(
      SIDES.filter((_, index) => typeof documents[index] === 'string'),
    );
    return buildFoldedLayout(
      hunks.length,
      collectSourceRanges(hunks, readableSides),
    );
  },
});

export default createViewedFileView;
