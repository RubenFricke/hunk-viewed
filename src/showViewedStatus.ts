import type { ExtensionStatusLineControls } from 'hunkdiff/extension';

const VIEWED_ITEM_ID = 'viewed';

/** The selected file's mark stays visible even when Hunk cannot fold it. */
const showViewedStatus = (
  statusLine: ExtensionStatusLineControls,
  viewed: boolean,
): void => {
  if (!viewed) {
    statusLine.clear(VIEWED_ITEM_ID);
    return;
  }
  statusLine.set({
    id: VIEWED_ITEM_ID,
    spans: [{ text: '✓ Viewed', tone: 'accent' }],
    alignment: 'left',
  });
};

export default showViewedStatus;
