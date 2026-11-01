import { describe, expect, it } from "vitest";
import { formatDays, wholeDays } from "@/lib/format-days";

describe("wholeDays", () => {
  it("rounds an average to the nearest whole day", () => {
    expect(wholeDays(11.7)).toBe(12);
    expect(wholeDays(11.4)).toBe(11);
    expect(wholeDays(14)).toBe(14);
  });
});

describe("formatDays", () => {
  it("writes whole days with the right plural", () => {
    expect(formatDays(11.7)).toBe("12 days");
    expect(formatDays(1)).toBe("1 day");
    expect(formatDays(1.2)).toBe("1 day");
    expect(formatDays(0)).toBe("0 days");
  });
});
