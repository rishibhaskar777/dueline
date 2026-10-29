import { beforeEach, describe, expect, it } from "vitest";
import { addDays, daysBetween, isDemoClock, today, toKolkataDate } from "@/lib/clock";
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

describe("toKolkataDate", () => {
  it("keeps a plain date", () => {
    expect(toKolkataDate("2026-10-15")).toBe("2026-10-15");
  });

  it("converts a timestamp to the Asia/Kolkata date", () => {
    expect(toKolkataDate("2026-10-15T18:29:00Z")).toBe("2026-10-15");
    expect(toKolkataDate("2026-10-15T18:31:00Z")).toBe("2026-10-16");
    expect(toKolkataDate("2026-10-15T20:00:00.000Z")).toBe("2026-10-16");
  });

  it("reads a space between the date and the time and any offset style", () => {
    expect(toKolkataDate("2026-10-15 23:00:00 +0000")).toBe("2026-10-16");
    expect(toKolkataDate("2026-10-15 23:00:00+00:00")).toBe("2026-10-16");
    expect(toKolkataDate("2026-10-15T10:00:00-07:00")).toBe("2026-10-15");
    expect(toKolkataDate("2026-10-15T20:00:00-07:00")).toBe("2026-10-16");
    expect(toKolkataDate("2026-10-15T12:00Z")).toBe("2026-10-15");
  });

  it("falls back to the date part when the time zone cannot be read", () => {
    expect(toKolkataDate("2026-10-15T23:00:00")).toBe("2026-10-15");
    expect(toKolkataDate("2026-10-15 11:42:00 PDT")).toBe("2026-10-15");
  });

  it("returns null for something that is not a date", () => {
    expect(toKolkataDate("yesterday")).toBeNull();
    expect(toKolkataDate("")).toBeNull();
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
