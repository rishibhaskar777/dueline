import { describe, expect, it } from "vitest";
import { formatDate } from "@/lib/format-date";
import { formatMoney, formatRate, formatRupees } from "@/lib/money/format";

describe("formatRupees", () => {
  it("groups digits the Indian way and drops the paise", () => {
    expect(formatRupees(8135)).toBe("₹8,135");
    expect(formatRupees(123456)).toBe("₹1,23,456");
    expect(formatRupees(12345678)).toBe("₹1,23,45,678");
  });
});

describe("formatMoney", () => {
  it("shows two decimals in the invoice currency", () => {
    expect(formatMoney({ currency: "USD", value: "4.70" })).toBe("$4.70");
    expect(formatMoney({ currency: "GBP", value: "600.00" })).toBe("£600.00");
  });
});

describe("formatRate", () => {
  it("shows a rupee rate to the paisa", () => {
    expect(formatRate(85.36)).toBe("85.36");
    expect(formatRate(94.9095)).toBe("94.91");
    expect(formatRate(92.0622)).toBe("92.06");
  });
});

describe("formatDate", () => {
  it("writes a plain date in words", () => {
    expect(formatDate("2026-10-28")).toBe("28 Oct 2026");
  });
});
