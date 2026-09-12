import type { BoundingBox } from '../types/domain';

type Size = { width: number; height: number };
export type DisplayBox = { left: number; top: number; width: number; height: number };

/** Maps an original-image xyxy box into a resizeMode="contain" display frame. */
export function scaleContainedBoundingBox(box: BoundingBox, source: Size, frame: Size): DisplayBox | undefined {
  if (![...box, source.width, source.height, frame.width, frame.height].every(Number.isFinite)) return undefined;
  if (source.width <= 0 || source.height <= 0 || frame.width <= 0 || frame.height <= 0) return undefined;
  const [rawX1, rawY1, rawX2, rawY2] = box;
  const x1 = Math.max(0, Math.min(source.width, rawX1));
  const y1 = Math.max(0, Math.min(source.height, rawY1));
  const x2 = Math.max(0, Math.min(source.width, rawX2));
  const y2 = Math.max(0, Math.min(source.height, rawY2));
  if (x2 <= x1 || y2 <= y1) return undefined;
  const scale = Math.min(frame.width / source.width, frame.height / source.height);
  const offsetX = (frame.width - source.width * scale) / 2;
  const offsetY = (frame.height - source.height * scale) / 2;
  return { left: offsetX + x1 * scale, top: offsetY + y1 * scale, width: (x2 - x1) * scale, height: (y2 - y1) * scale };
}
