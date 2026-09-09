export type FabSide = 'left' | 'right';
export type SavedFabPosition = { side: FabSide; normalizedY: number };
export type FabBounds = { minX: number; maxX: number; minY: number; maxY: number };

export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
export function clampFab(x: number, y: number, bounds: FabBounds) {
  return { x: clamp(x, bounds.minX, bounds.maxX), y: clamp(y, bounds.minY, bounds.maxY) };
}
export function snapFab(x: number, y: number, bounds: FabBounds) {
  const side: FabSide = x + (bounds.maxX - bounds.minX) / 2 < bounds.maxX ? 'left' : 'right';
  return { ...clampFab(side === 'left' ? bounds.minX : bounds.maxX, y, bounds), side };
}
export function restoreFab(saved: SavedFabPosition | null, bounds: FabBounds) {
  const side: FabSide = saved?.side === 'left' ? 'left' : 'right';
  const normalizedY = typeof saved?.normalizedY === 'number' && Number.isFinite(saved.normalizedY) ? clamp(saved.normalizedY, 0, 1) : 1;
  return {
    x: side === 'left' ? bounds.minX : bounds.maxX,
    y: bounds.minY + (bounds.maxY - bounds.minY) * normalizedY,
    side,
  };
}
export function normalizedFab(side: FabSide, y: number, bounds: FabBounds): SavedFabPosition {
  const range = Math.max(1, bounds.maxY - bounds.minY);
  return { side, normalizedY: clamp((y - bounds.minY) / range, 0, 1) };
}
