import { describe, expect, it } from "vitest";
import {
  cardDelay,
  cardHighlightKeyframes,
  FLOW_CYCLE_SECONDS,
  FLOW_HIGHLIGHT_SECONDS,
  flowCycle,
  railDelay,
} from "@/components/site/flow-timing";

const RAILS = 3;
const CARDS = 4;

function secondsOf(value: string): number {
  return Number(value.replace("s", ""));
}

describe("railDelay", () => {
  it("starts the rails at 0, 1/3 and 2/3 of the cycle", () => {
    const delays = [0, 1, 2].map((rail) => secondsOf(railDelay(rail, RAILS)));
    expect(delays[0]).toBe(0);
    expect(delays[1]).toBeCloseTo(FLOW_CYCLE_SECONDS / 3, 3);
    expect(delays[2]).toBeCloseTo((FLOW_CYCLE_SECONDS * 2) / 3, 3);
  });

  it("writes the cycle as seconds", () => {
    expect(flowCycle()).toBe("4.8s");
    expect(railDelay(1, RAILS)).toBe("1.6s");
  });
});

describe("cardDelay", () => {
  it("lights the first card at the start and the next two as each rail ends", () => {
    expect(cardDelay(0, CARDS)).toBe(railDelay(0, RAILS));
    expect(cardDelay(1, CARDS)).toBe(railDelay(1, RAILS));
    expect(cardDelay(2, CARDS)).toBe(railDelay(2, RAILS));
  });

  it("ends the last card's highlight where the cycle ends", () => {
    const start = secondsOf(cardDelay(3, CARDS));
    expect(start + FLOW_HIGHLIGHT_SECONDS).toBeCloseTo(FLOW_CYCLE_SECONDS, 3);
  });
});

describe("cardHighlightKeyframes", () => {
  it("fits the highlight inside its share of the cycle", () => {
    const share = (FLOW_HIGHLIGHT_SECONDS / FLOW_CYCLE_SECONDS) * 100;
    expect(cardHighlightKeyframes()).toContain(`0%,${share}%,100%`);
    expect(cardHighlightKeyframes()).toContain(`${share / 2}%{`);
  });
});
