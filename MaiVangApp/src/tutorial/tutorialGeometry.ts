export type Rect = { x: number; y: number; width: number; height: number };
type Size = Pick<Rect, 'width' | 'height'>;
type Insets = { top: number; right: number; bottom: number; left: number };

export function validRect(rect: Rect) {
  return [rect.x, rect.y, rect.width, rect.height, right(rect), bottom(rect)].every(Number.isFinite)
    && rect.width > 0 && rect.height > 0;
}

const right = (rect: Rect) => rect.x + rect.width;
const bottom = (rect: Rect) => rect.y + rect.height;

export function intersection(a: Rect, b: Rect): Rect | null {
  if (!validRect(a) || !validRect(b)) return null;
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const rect = { x, y, width: Math.min(right(a), right(b)) - x, height: Math.min(bottom(a), bottom(b)) - y };
  return validRect(rect) ? rect : null;
}

export function relativeTo(rect: Rect, origin: Rect): Rect {
  return { ...rect, x: rect.x - origin.x, y: rect.y - origin.y };
}

export function safeBounds(bounds: Rect, insets: Insets): Rect {
  const rect = {
    x: bounds.x + insets.left,
    y: bounds.y + insets.top,
    width: bounds.width - insets.left - insets.right,
    height: bounds.height - insets.top - insets.bottom,
  };
  return intersection(bounds, rect) ?? bounds;
}

export function spotlight(target: Rect, visible: Rect, padding = 7): Rect | null {
  const clipped = intersection(target, visible);
  if (!clipped) return null;
  return intersection({
    x: clipped.x - padding,
    y: clipped.y - padding,
    width: clipped.width + 2 * padding,
    height: clipped.height + 2 * padding,
  }, visible);
}

export function shadeRects(bounds: Rect, focus: Rect): Rect[] {
  const hole = intersection(bounds, focus);
  if (!hole) return [bounds];
  return [
    { x: bounds.x, y: bounds.y, width: bounds.width, height: hole.y - bounds.y },
    { x: bounds.x, y: hole.y, width: hole.x - bounds.x, height: hole.height },
    { x: right(hole), y: hole.y, width: right(bounds) - right(hole), height: hole.height },
    { x: bounds.x, y: bottom(hole), width: bounds.width, height: bottom(bounds) - bottom(hole) },
  ];
}

export function placeTooltip(bounds: Rect, focus: Rect | null, size: Size, minimumHeight: number): Rect {
  const width = Math.min(size.width, bounds.width);
  const height = Math.min(size.height, bounds.height);
  const x = bounds.x + (bounds.width - width) / 2;
  if (focus) {
    const gap = 12;
    const below = bottom(focus) + gap;
    const above = focus.y - gap;
    const belowHeight = bottom(bounds) - Math.max(below, bounds.y);
    const aboveHeight = Math.min(above, bottom(bounds)) - bounds.y;
    if (belowHeight >= height) return { x, y: Math.max(below, bounds.y), width, height };
    if (aboveHeight >= height) return { x, y: Math.min(above, bottom(bounds)) - height, width, height };

    if (height === size.height) {
      const y = Math.max(bounds.y, Math.min(focus.y, bottom(bounds) - height));
      if (right(bounds) - right(focus) - gap >= width) return { x: right(focus) + gap, y, width, height };
      if (focus.x - gap - bounds.x >= width) return { x: focus.x - gap - width, y, width, height };
    }

    if (Math.max(aboveHeight, belowHeight) >= Math.min(height, minimumHeight)) {
      return belowHeight >= aboveHeight
        ? { x, y: below, width, height: belowHeight }
        : { x, y: bounds.y, width, height: aboveHeight };
    }
  }
  return { x, y: bounds.y + (bounds.height - height) / 2, width, height };
}

export function isCurrentMeasurement(generation: number, current: number) {
  return generation === current;
}
