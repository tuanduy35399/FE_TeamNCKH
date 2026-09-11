export const TAB_BAR_INTERACTIVE_HEIGHT = 58;
export const MIN_BOTTOM_PADDING = 8;

export function bottomSafePadding(bottomInset: number) {
  return Math.max(MIN_BOTTOM_PADDING, Math.max(0, bottomInset));
}

export function tabBarHeight(bottomInset: number) {
  return TAB_BAR_INTERACTIVE_HEIGHT + bottomSafePadding(bottomInset);
}

export function floatingFabBottom(bottomReserved: number, gap = 12) {
  return Math.max(0, bottomReserved) + gap;
}
