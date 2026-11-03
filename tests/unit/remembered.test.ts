import { describe, expect, it } from "vitest";
import { forgetRemembered, recall, remember } from "@/lib/remembered";

describe("remembered screen data", () => {
  it("gives back what a screen last showed, and nothing for a screen not seen", () => {
    remember("nudges", { count: 2 });
    expect(recall("nudges")).toEqual({ count: 2 });
    expect(recall("never")).toBeUndefined();
  });

  it("is forgotten when the demo is locked", () => {
    remember("receivables", [1]);
    forgetRemembered();
    expect(recall("receivables")).toBeUndefined();
  });
});
