import { describe, expect, it } from "vitest";
import {
  DEFAULT_LAYOUT,
  moveWidget,
  parseLayout,
  resetLayout,
  setWidgetVisible,
  WIDGETS,
} from "@/components/dashboard/dashboard-layout";

// What the browser hands over is a string; undefined and objects stand for anything unreadable.
const validateLayout = (value: unknown) => parseLayout(JSON.stringify(value) ?? null);

const ids = (layout: { id: string }[]): string[] => layout.map(({ id }) => id);

describe("validateLayout", () => {
  it("keeps a valid saved layout as it is", () => {
    const saved = [...DEFAULT_LAYOUT]
      .reverse()
      .map((entry, index) => ({ ...entry, visible: index % 2 === 0 }));
    expect(validateLayout(saved)).toEqual(saved);
  });

  it("drops unknown and repeated widgets and entries of the wrong shape", () => {
    const layout = validateLayout([
      { id: "rates", visible: false },
      { id: "nope", visible: true },
      { id: "rates", visible: true },
      { id: "totals", visible: "yes" },
      "totals",
      null,
    ]);
    expect(layout[0]).toEqual({ id: "rates", visible: false });
    expect(ids(layout).filter((id) => id === "rates")).toHaveLength(1);
    expect(ids(layout)).not.toContain("nope");
  });

  it("appends widgets missing from the saved layout, shown", () => {
    const layout = validateLayout([{ id: "invoices", visible: false }]);
    expect(layout[0]).toEqual({ id: "invoices", visible: false });
    expect(layout).toHaveLength(WIDGETS.length);
    expect(layout.slice(1).every(({ visible }) => visible)).toBe(true);
  });

  it("falls back to the default for something that is not a list", () => {
    expect(validateLayout({})).toEqual(DEFAULT_LAYOUT);
    expect(validateLayout(undefined)).toEqual(DEFAULT_LAYOUT);
  });
});

describe("parseLayout", () => {
  it("uses the default layout when nothing is stored or the text is not JSON", () => {
    expect(parseLayout(null)).toEqual(DEFAULT_LAYOUT);
    expect(parseLayout("{not json")).toEqual(DEFAULT_LAYOUT);
  });

  it("reads a stored layout", () => {
    const stored = JSON.stringify([{ id: "activity", visible: false }]);
    expect(parseLayout(stored)[0]).toEqual({ id: "activity", visible: false });
  });
});

describe("moveWidget, setWidgetVisible and resetLayout", () => {
  it("moves a widget up or down one place", () => {
    expect(ids(moveWidget(DEFAULT_LAYOUT, "forecast", -1)).slice(0, 4)).toEqual([
      "morning",
      "checklist",
      "forecast",
      "totals",
    ]);
    expect(ids(moveWidget(DEFAULT_LAYOUT, "totals", 1)).slice(0, 4)).toEqual([
      "morning",
      "checklist",
      "forecast",
      "totals",
    ]);
  });

  it("does not move the first widget up or the last down", () => {
    expect(moveWidget(DEFAULT_LAYOUT, "morning", -1)).toBe(DEFAULT_LAYOUT);
    expect(moveWidget(DEFAULT_LAYOUT, "activity", 1)).toBe(DEFAULT_LAYOUT);
  });

  it("does not change the layout it was given", () => {
    const before = JSON.stringify(DEFAULT_LAYOUT);
    moveWidget(DEFAULT_LAYOUT, "forecast", 1);
    setWidgetVisible(DEFAULT_LAYOUT, "forecast", false);
    expect(JSON.stringify(DEFAULT_LAYOUT)).toBe(before);
  });

  it("shows and hides a widget", () => {
    const hidden = setWidgetVisible(DEFAULT_LAYOUT, "rates", false);
    expect(hidden.find(({ id }) => id === "rates")?.visible).toBe(false);
    expect(setWidgetVisible(hidden, "rates", true)).toEqual(DEFAULT_LAYOUT);
  });

  it("goes back to the default", () => {
    expect(resetLayout()).toEqual(DEFAULT_LAYOUT);
  });
});

describe("the This morning card", () => {
  it("is the first widget of the default layout, shown", () => {
    expect(DEFAULT_LAYOUT[0]).toEqual({ id: "morning", visible: true });
  });

  it("is added, shown, to a layout saved before it existed", () => {
    const saved = JSON.stringify([{ id: "totals", visible: true }]);
    expect(parseLayout(saved).find(({ id }) => id === "morning")).toEqual({
      id: "morning",
      visible: true,
    });
  });
});
