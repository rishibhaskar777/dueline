import { describe, expect, it } from "vitest";
import {
  cardDelay,
  cardHighlightKeyframes,
  FLOW_CYCLE_SECONDS,
  FLOW_HIGHLIGHT_SECONDS,
  flowCycle,
  railDelay,
} from "@/components/site/flow-timing";

function secondsOf(value: string): number {
  return Number(value.replace("s", ""));
}

describe("railDelay", () => {
  it("starts the rails at 0, 1/4 and 2/4 of the cycle, leaving the last quarter to rest", () => {
    const delays = [0, 1, 2].map((rail) => secondsOf(railDelay(rail)));
    expect(delays[0]).toBe(0);
    expect(delays[1]).toBeCloseTo(FLOW_CYCLE_SECONDS / 4, 3);
    expect(delays[2]).toBeCloseTo(FLOW_CYCLE_SECONDS / 2, 3);
  });

  it("writes the cycle as seconds", () => {
    expect(flowCycle()).toBe("5.6s");
    expect(railDelay(1)).toBe("1.4s");
  });
});

describe("cardDelay", () => {
  it("lights the cards at 0, 1/4, 2/4 and 3/4 of the cycle", () => {
    const delays = [0, 1, 2, 3].map((card) => secondsOf(cardDelay(card)));
    expect(delays).toEqual([0, 1.4, 2.8, 4.2]);
  });

  it("lights each card as the dot of the rail before it arrives", () => {
    expect(cardDelay(1)).toBe(railDelay(1));
    expect(cardDelay(2)).toBe(railDelay(2));
  });

  it("finishes the last highlight before the cycle ends", () => {
    expect(secondsOf(cardDelay(3)) + FLOW_HIGHLIGHT_SECONDS).toBeLessThan(FLOW_CYCLE_SECONDS);
  });
});

describe("cardHighlightKeyframes", () => {
  it("fits the highlight inside its share of the cycle", () => {
    const share = (FLOW_HIGHLIGHT_SECONDS / FLOW_CYCLE_SECONDS) * 100;
    expect(cardHighlightKeyframes()).toContain(`0%,${share}%,100%`);
    expect(cardHighlightKeyframes()).toContain(`${share / 2}%{`);
  });
});
