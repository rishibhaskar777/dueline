import { describe, expect, it } from "vitest";
import { markerOf, memoOf, purposeCodeOf } from "@/lib/paypal/memo";

describe("invoice memo", () => {
  it("puts the purpose code next to the marker, only when there is one", () => {
    expect(memoOf("dueline-request:abc", "P1007")).toBe("dueline-request:abc purpose:P1007");
    expect(memoOf("dueline-request:abc", null)).toBe("dueline-request:abc");
  });

  it("finds the marker whether or not a purpose code follows", () => {
    expect(markerOf("dueline-demo:tandem purpose:P1099")).toBe("dueline-demo:tandem");
    expect(markerOf("dueline-demo:tandem")).toBe("dueline-demo:tandem");
    expect(markerOf(undefined)).toBe("");
  });

  it("reads a purpose code from the list and nothing else", () => {
    expect(purposeCodeOf("dueline-request:abc purpose:P1007")).toBe("P1007");
    expect(purposeCodeOf("dueline-request:abc purpose:P9999")).toBeNull();
    expect(purposeCodeOf("dueline-request:abc")).toBeNull();
    expect(purposeCodeOf(undefined)).toBeNull();
  });
});
