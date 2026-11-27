export const TAB_BAR_ICON_HEIGHT = 28;
export const TAB_BAR_LABEL_GAP = 2;
export const TAB_BAR_ITEM_PADDING = 5;
export const TAB_BAR_MIN_CONTENT_HEIGHT = 64;
export const TAB_BAR_OUTSIDE_GAP = 10;

function nonnegative(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function bottomTabLayout(bottomInset: number, labelHeight: number) {
  // The measured label can wrap or grow with accessibility fonts.
  const contentHeight = Math.max(TAB_BAR_MIN_CONTENT_HEIGHT,
    TAB_BAR_ICON_HEIGHT + TAB_BAR_LABEL_GAP + 2 * TAB_BAR_ITEM_PADDING + Math.ceil(nonnegative(labelHeight)));
  const bottomPadding = nonnegative(bottomInset) + TAB_BAR_OUTSIDE_GAP;
  return { contentHeight, bottomPadding, height: contentHeight + bottomPadding };
}

export function floatingFabBottom(bottomReserved: number, gap = 12) {
  return Math.max(0, bottomReserved) + gap;
}
