export interface IndicatorItem {
  left: number;
  width: number;
}

export interface IndicatorInput {
  items: IndicatorItem[];
  active: number | null;
  hovered: number | null;
  focused: number | null;
  clicked: number | null;
}

export interface IndicatorTarget {
  index: number;
  x: number;
  width: number;
}

// Where the sliding pill sits: under the hovered item, else the focused one, else the one last
// clicked, else the active one. An index with no measured item is skipped.
export function pickIndicator({
  items,
  active,
  hovered,
  focused,
  clicked,
}: IndicatorInput): IndicatorTarget | null {
  for (const index of [hovered, focused, clicked, active]) {
    if (index === null) continue;
    const item = items[index];
    if (item) return { index, x: item.left, width: item.width };
  }
  return null;
}
