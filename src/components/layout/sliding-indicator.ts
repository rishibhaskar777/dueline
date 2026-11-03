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

export interface Click {
  index: number;
  // The active index when the click happened; the click stops counting once that changes.
  whileActive: number | null;
}

// What the pointer and keyboard are doing to the items. It belongs to one `key` (the page the bar is
// on), so a page change starts again from nothing.
export interface Interaction {
  key: string | null;
  hovered: number | null;
  focused: number | null;
  click: Click | null;
}

export const NO_INTERACTION: Interaction = { key: null, hovered: null, focused: null, click: null };

export type InteractionEvent =
  | { type: "pointerenter"; index: number; pointerType: string }
  | { type: "pointerleave" }
  | { type: "focus"; index: number; visible: boolean }
  | { type: "blur"; index: number }
  | { type: "click"; index: number; active: number | null }
  | { type: "reset" };

export type InteractionAction = InteractionEvent & { key: string | null };

export function interact(state: Interaction, action: InteractionAction): Interaction {
  const current = state.key === action.key ? state : { ...NO_INTERACTION, key: action.key };
  switch (action.type) {
    case "pointerenter":
      // Only a mouse hovers; a touch or pen "enter" fires on a tap and is not followed by a leave.
      return action.pointerType === "mouse" ? { ...current, hovered: action.index } : current;
    case "pointerleave":
      return { ...current, hovered: null };
    case "focus":
      // A focus the keyboard did not ask for, such as the one a click leaves behind, does not count.
      return action.visible ? { ...current, focused: action.index } : current;
    case "blur":
      return current.focused === action.index ? { ...current, focused: null } : current;
    case "click":
      return {
        ...current,
        hovered: null,
        click: { index: action.index, whileActive: action.active },
      };
    case "reset":
      return { ...NO_INTERACTION, key: action.key };
  }
}

// The inputs the pill needs from the interaction, for the page the bar is on now.
export function indicatorState(
  state: Interaction,
  key: string | null,
  active: number | null,
): Pick<IndicatorInput, "hovered" | "focused" | "clicked"> {
  if (state.key !== key) return { hovered: null, focused: null, clicked: null };
  const { click } = state;
  return {
    hovered: state.hovered,
    focused: state.focused,
    clicked: click && click.whileActive === active ? click.index : null,
  };
}
