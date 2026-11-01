import { describe, expect, it } from "vitest";
import {
  estimateLabelWidth,
  LABEL_GAP_PX,
  NUDGE_DOWN_PX,
  placeEndLabel,
  RAISE_PX,
} from "@/components/receivables/label-placement";

const AXIS = 500;
const WIDTH = 60;

function place(overrides: Partial<Parameters<typeof placeEndLabel>[0]>) {
  return placeEndLabel({
    rightStartPx: 100,
    endPx: 100,
    widthPx: WIDTH,
    axisPx: AXIS,
    marksPx: [],
    ...overrides,
  });
}

describe("placeEndLabel", () => {
  it("keeps a label to the right of its dot when nothing is in the way", () => {
    expect(place({})).toEqual({ side: "right", dy: 0 });
  });

  it("moves a label that would cross the Today line to the other side of its dot", () => {
    // The label would span 112 to 172 and the Today line is at 140.
    expect(place({ marksPx: [140] })).toEqual({ side: "left", dy: RAISE_PX });
  });

  it("moves a label at the right edge to the left of its dot", () => {
    const placement = place({ rightStartPx: 460, endPx: 460 });
    expect(placement.side).toBe("left");
  });

  it("keeps a label that ends exactly at the right edge on the right", () => {
    const start = AXIS - WIDTH - LABEL_GAP_PX;
    expect(place({ rightStartPx: start, endPx: start }).side).toBe("right");
  });

  it("treats a due tick right beside the dot like the Today line", () => {
    expect(place({ rightStartPx: 100, marksPx: [118] }).side).toBe("left");
  });

  it("nudges the label down when both sides are blocked", () => {
    // Left of the dot runs off the axis start and the right side holds the Today line.
    const placement = place({ rightStartPx: 20, endPx: 20, marksPx: [60] });
    expect(placement).toEqual({ side: "right", dy: NUDGE_DOWN_PX });
  });

  it("nudges down on the left at the right edge when the left is blocked too", () => {
    const placement = place({ rightStartPx: 480, endPx: 480, marksPx: [440] });
    expect(placement).toEqual({ side: "left", dy: NUDGE_DOWN_PX });
  });
});

describe("estimateLabelWidth", () => {
  it("grows with the text", () => {
    expect(estimateLabelWidth("Paid")).toBeLessThan(estimateLabelWidth("Paid 12 days late"));
  });
});
