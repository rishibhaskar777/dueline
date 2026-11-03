import { describe, expect, it } from "vitest";
import {
  NO_INTERACTION,
  indicatorState,
  interact,
  pickIndicator,
  type IndicatorInput,
  type Interaction,
  type InteractionEvent,
} from "@/components/layout/sliding-indicator";

const items = [
  { left: 4, width: 80 },
  { left: 88, width: 120 },
  { left: 212, width: 90 },
];

function pick(overrides: Partial<IndicatorInput>) {
  return pickIndicator({
    items,
    active: null,
    hovered: null,
    focused: null,
    clicked: null,
    ...overrides,
  });
}

describe("pickIndicator", () => {
  it("sits under the active item when nothing else is going on", () => {
    expect(pick({ active: 1 })).toEqual({ index: 1, x: 88, width: 120 });
  });

  it("prefers the last clicked item over the active one", () => {
    expect(pick({ active: 0, clicked: 2 })).toEqual({ index: 2, x: 212, width: 90 });
  });

  it("prefers the focused item over a click", () => {
    expect(pick({ active: 0, clicked: 2, focused: 1 })?.index).toBe(1);
  });

  it("lets the hovered item win over everything", () => {
    expect(pick({ active: 0, clicked: 2, focused: 1, hovered: 0 })?.index).toBe(0);
  });

  it("is null when no item is hovered, focused, clicked or active", () => {
    expect(pick({})).toBeNull();
  });

  it("is null for an empty list", () => {
    expect(pick({ items: [], active: 0, hovered: 0 })).toBeNull();
  });

  it("skips an index that has not been measured and falls through to the next rule", () => {
    expect(pick({ active: 1, hovered: 7 })?.index).toBe(1);
  });
});

describe("interact", () => {
  const send = (state: Interaction, event: InteractionEvent, key: string | null = "/receivables") =>
    interact(state, { ...event, key });
  const shown = (state: Interaction, active: number | null, key: string | null = "/receivables") =>
    pickIndicator({ items, active, ...indicatorState(state, key, active) })?.index;

  it("puts the pill on the hovered tab for a mouse", () => {
    const state = send(NO_INTERACTION, { type: "pointerenter", index: 2, pointerType: "mouse" });
    expect(shown(state, 0)).toBe(2);
  });

  it("goes back to the active tab when the page changes under a stale hover", () => {
    const hovered = send(NO_INTERACTION, { type: "pointerenter", index: 2, pointerType: "mouse" });
    expect(shown(hovered, 0, "/invoices/INV2-1")).toBe(0);
    expect(shown(hovered, 0, "/receivables")).toBe(2);
  });

  it("does not let a touch or pen enter move the pill", () => {
    for (const pointerType of ["touch", "pen"]) {
      const state = send(NO_INTERACTION, { type: "pointerenter", index: 2, pointerType });
      expect(shown(state, 0)).toBe(0);
    }
  });

  it("lets go of the hover when the pointer leaves, or when the window loses it", () => {
    const hovered = send(NO_INTERACTION, { type: "pointerenter", index: 1, pointerType: "mouse" });
    expect(shown(send(hovered, { type: "pointerleave" }), 0)).toBe(0);
    expect(shown(send(hovered, { type: "reset" }), 0)).toBe(0);
  });

  it("only counts a focus the keyboard made visible", () => {
    const clicked = send(NO_INTERACTION, { type: "focus", index: 2, visible: false });
    expect(shown(clicked, 0)).toBe(0);
    const tabbed = send(NO_INTERACTION, { type: "focus", index: 2, visible: true });
    expect(shown(tabbed, 0)).toBe(2);
    expect(shown(send(tabbed, { type: "blur", index: 2 }), 0)).toBe(0);
  });

  it("keeps a click on the clicked tab until the active tab changes", () => {
    const state = send(NO_INTERACTION, { type: "click", index: 1, active: 0 });
    expect(shown(state, 0)).toBe(1);
    expect(shown(state, 1)).toBe(1);
    expect(shown(state, 2)).toBe(2);
  });
});
