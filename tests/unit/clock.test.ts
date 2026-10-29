import { beforeEach, describe, expect, it } from "vitest";
import { addDays, daysBetween, isDemoClock, today } from "@/lib/clock";
import { stubEnv } from "../support/env";

describe("today", () => {
  beforeEach(() => stubEnv());

  it("uses DEMO_TODAY when it is set", () => {
    stubEnv({ DEMO_TODAY: "2026-10-17" });
    expect(today(new Date("2030-01-01T00:00:00Z"))).toBe("2026-10-17");
    expect(isDemoClock()).toBe(true);
  });

  it("uses the Asia/Kolkata date otherwise", () => {
    expect(isDemoClock()).toBe(false);
    expect(today(new Date("2026-10-28T18:29:00Z"))).toBe("2026-10-28");
    expect(today(new Date("2026-10-28T18:31:00Z"))).toBe("2026-10-29");
  });
});

describe("date arithmetic", () => {
  it("adds days across a month end", () => {
    expect(addDays("2026-10-30", 3)).toBe("2026-11-02");
    expect(addDays("2026-11-01", -1)).toBe("2026-10-31");
  });

  it("counts whole days between dates", () => {
    expect(daysBetween("2026-10-30", "2026-11-02")).toBe(3);
    expect(daysBetween("2026-11-02", "2026-10-30")).toBe(-3);
    expect(daysBetween("2026-10-17", "2026-10-17")).toBe(0);
  });
});
