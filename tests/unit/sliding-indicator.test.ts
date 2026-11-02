import { describe, expect, it } from "vitest";
import { pickIndicator, type IndicatorInput } from "@/components/layout/sliding-indicator";

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
