import { describe, expect, it } from "vitest";
import { LANDING_CHOICES } from "@/components/site/landing-choices";

describe("landing choices", () => {
  it("has the three headings, each with its own card kind", () => {
    expect(LANDING_CHOICES.map(({ title }) => title)).toEqual([
      "Know your rupees",
      "Spot late payers",
      "Stay export-ready",
    ]);
    expect(LANDING_CHOICES.map(({ card }) => card)).toEqual(["payout", "radar", "register"]);
  });

  it("gives every choice a sentence and a unique id", () => {
    expect(new Set(LANDING_CHOICES.map(({ id }) => id)).size).toBe(3);
    for (const choice of LANDING_CHOICES) expect(choice.sentence.length).toBeGreaterThan(40);
  });
});
