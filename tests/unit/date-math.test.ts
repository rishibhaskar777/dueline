import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  daysBetween,
  financialYearOf,
  financialYearRange,
  isFinancialYear,
  todayInKolkata,
} from "@/lib/date-math";
import { formatDayMonth, formatMonth, formatTimestamp } from "@/lib/format-date";

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

describe("months", () => {
  it("moves a month forwards and backwards across a year end", () => {
    expect(addMonths("2026-10", 1)).toBe("2026-11");
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2026-10", 0)).toBe("2026-10");
  });

  it("names a month", () => {
    expect(formatMonth("2026-10")).toBe("October 2026");
  });
});

describe("financial years", () => {
  it.each([
    ["2026-03", "2025-26"],
    ["2026-04", "2026-27"],
    ["2026-12", "2026-27"],
    ["2027-01", "2026-27"],
    ["2027-03", "2026-27"],
    ["2027-04", "2027-28"],
    ["2099-04", "2099-00"],
  ])("puts %s in %s", (month, fy) => {
    expect(financialYearOf(month)).toBe(fy);
  });

  it("runs from 1 April to 31 March", () => {
    expect(financialYearRange("2026-27")).toEqual({ from: "2026-04-01", to: "2027-03-31" });
  });

  it("knows a financial year from a pair of years that do not follow each other", () => {
    expect(isFinancialYear("2026-27")).toBe(true);
    expect(isFinancialYear("2099-00")).toBe(true);
    expect(isFinancialYear("2026-28")).toBe(false);
    expect(isFinancialYear("2026")).toBe(false);
    expect(isFinancialYear("26-27")).toBe(false);
  });
});
