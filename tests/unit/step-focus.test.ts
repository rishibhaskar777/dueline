import { describe, expect, it } from "vitest";
import { scrollBehaviorFor } from "@/components/invoices/step-focus";

describe("scrollBehaviorFor", () => {
  it("scrolls smoothly unless reduced motion is on", () => {
    expect(scrollBehaviorFor(false)).toBe("smooth");
    expect(scrollBehaviorFor(true)).toBe("auto");
  });
});
