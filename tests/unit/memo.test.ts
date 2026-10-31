import { describe, expect, it } from "vitest";
import { markerOf, memoOf, purposeCodeOf, sacOf } from "@/lib/paypal/memo";

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

  it("keeps the SAC of the first item next to the purpose code, only when there is one", () => {
    expect(memoOf("dueline-request:abc", "P1007", "998314")).toBe(
      "dueline-request:abc purpose:P1007 sac:998314",
    );
    expect(memoOf("dueline-request:abc", null, "998314")).toBe("dueline-request:abc sac:998314");
    expect(memoOf("dueline-request:abc", "P1007", null)).toBe("dueline-request:abc purpose:P1007");
  });

  it("reads a SAC and nothing else, and still finds the marker and purpose code", () => {
    const memo = "dueline-request:abc purpose:P1007 sac:998314";
    expect(sacOf(memo)).toBe("998314");
    expect(markerOf(memo)).toBe("dueline-request:abc");
    expect(purposeCodeOf(memo)).toBe("P1007");
    expect(sacOf("dueline-request:abc sac:12345")).toBeNull();
    expect(sacOf("dueline-request:abc purpose:P1007")).toBeNull();
    expect(sacOf(undefined)).toBeNull();
  });
});
