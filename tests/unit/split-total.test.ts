import { describe, expect, it } from "vitest";
import { splitTotal } from "@/lib/money/split";

describe("splitTotal", () => {
  it("rounds the deposit to the cent and leaves the rest as the balance", () => {
    // 33% of 1,000.01 is 330.0033, so the deposit is 330.00 and the balance 670.01.
    expect(splitTotal(100_001, 33)).toEqual({ depositMinor: 33_000, balanceMinor: 67_001 });
    expect(splitTotal(184_500, 50)).toEqual({ depositMinor: 92_250, balanceMinor: 92_250 });
  });

  it("always adds up to the total", () => {
    for (const total of [1, 2, 99, 101, 12_345, 100_001, 999_999]) {
      for (let percent = 1; percent <= 99; percent += 1) {
        const parts = splitTotal(total, percent);
        if (parts) expect(parts.depositMinor + parts.balanceMinor).toBe(total);
      }
    }
  });

  it("adds up to the cent for every percent and awkward totals", () => {
    const totals = [
      2,
      3,
      99,
      100,
      101,
      199,
      333,
      1_999,
      100_001,
      123_457,
      999_999,
      1_000_001,
      99_999_999,
      // The largest total the form allows: 50 lines of 999 at a unit price near the safe limit.
      Number.MAX_SAFE_INTEGER - 1,
      Number.MAX_SAFE_INTEGER,
    ];
    for (const total of totals) {
      for (let percent = 1; percent <= 99; percent += 1) {
        const parts = splitTotal(total, percent);
        if (!parts) {
          expect(total * percent < 100 || total - Math.round((total * percent) / 100) < 1).toBe(
            true,
          );
          continue;
        }
        expect(parts.depositMinor + parts.balanceMinor, `${total} at ${percent}%`).toBe(total);
        expect(Number.isSafeInteger(parts.depositMinor)).toBe(true);
        expect(parts.depositMinor).toBeGreaterThanOrEqual(1);
        expect(parts.balanceMinor).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it("matches the exact fraction, rounded half up, for small and very large totals", () => {
    for (const total of [100_001, 7_777_777, 123_456_789, Number.MAX_SAFE_INTEGER]) {
      for (let percent = 1; percent <= 99; percent += 1) {
        const exact = (BigInt(total) * BigInt(percent) * BigInt(2) + BigInt(100)) / BigInt(200);
        expect(splitTotal(total, percent)?.depositMinor).toBe(Number(exact));
      }
    }
  });

  it("refuses a total that is not a safe whole number of cents", () => {
    expect(splitTotal(Number.MAX_SAFE_INTEGER + 2, 50)).toBeNull();
    expect(splitTotal(-100, 50)).toBeNull();
  });

  it("refuses a part under one cent and a percent outside 1 to 99", () => {
    expect(splitTotal(10, 1)).toBeNull();
    expect(splitTotal(1, 50)).toBeNull();
    expect(splitTotal(10_000, 0)).toBeNull();
    expect(splitTotal(10_000, 100)).toBeNull();
    expect(splitTotal(10_000, 12.5)).toBeNull();
  });
});
