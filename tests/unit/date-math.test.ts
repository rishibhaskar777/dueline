import { describe, expect, it } from "vitest";
import { addDays, daysBetween, todayInKolkata } from "@/lib/date-math";
import { formatDayMonth, formatTimestamp } from "@/lib/format-date";

describe("date math", () => {
  it("adds and counts days across a month end", () => {
    expect(addDays("2026-10-30", 3)).toBe("2026-11-02");
    expect(daysBetween("2026-10-28", "2026-11-14")).toBe(17);
  });

  it("reads the date in Asia/Kolkata", () => {
    expect(todayInKolkata(new Date("2026-10-28T18:31:00Z"))).toBe("2026-10-29");
  });
});

describe("date formats", () => {
  it("formats a day and month for chart ticks", () => {
    expect(formatDayMonth("2026-11-13")).toBe("13 Nov");
  });

  it("formats an exact time in Asia/Kolkata", () => {
    expect(formatTimestamp("2026-10-15T11:42:00Z")).toMatch(/^15 Oct 2026.*5:12.*IST$/i);
  });
});
