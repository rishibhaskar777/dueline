import { describe, expect, it } from "vitest";
import { describeRupees, fallbackNote } from "@/components/export/register-text";
import { exportRegister } from "@/mocks/fixtures";
import type { ExportRegister, ExportRegisterRow } from "@/types";

const [estimatedRow, reportedRow] = exportRegister.rows;
const feeKnownRow = { ...estimatedRow, fee: reportedRow.fee, net: reportedRow.net };
const bankRow = {
  ...estimatedRow,
  bankReference: null,
};

function register(rows: ExportRegisterRow[], bankPayments = 0): ExportRegister {
  const outsideRows = Array.from({ length: bankPayments }, () => bankRow);
  return { ...exportRegister, rows, outsideRows, totalInr: 1000 };
}

describe("describeRupees", () => {
  it("counts payments on PayPal's figures, estimates and bank transfers", () => {
    expect(describeRupees(register([reportedRow, estimatedRow], 2))).toBe(
      "1 from PayPal's figures, 1 estimated, 2 by bank",
    );
  });

  it("counts a payment with PayPal's fee and net but estimated rupees as PayPal's figures", () => {
    expect(describeRupees(register([feeKnownRow], 4))).toBe("1 from PayPal's figures, 4 by bank");
  });

  it("says all estimated when PayPal reported nothing", () => {
    expect(describeRupees(register([estimatedRow, estimatedRow]))).toBe("All estimated");
  });

  it("says all from PayPal's figures when nothing is estimated", () => {
    expect(describeRupees(register([reportedRow, feeKnownRow]))).toBe("All from PayPal's figures");
  });

  it("says all by bank when every payment was a transfer", () => {
    expect(describeRupees(register([], 3))).toBe("All by bank");
  });

  it("does not repeat the total in the note", () => {
    expect(describeRupees(register([estimatedRow]))).not.toContain("1,000");
  });

  it("reports nothing when there are no rupees", () => {
    expect(describeRupees({ ...register([estimatedRow]), totalInr: 0 })).toBe(
      "No rupees to report",
    );
  });
});

describe("fallbackNote", () => {
  it("names the empty month and the one shown", () => {
    expect(fallbackNote("2026-11", "2026-10")).toBe(
      "No payments in November yet. Showing October, the latest month with payments.",
    );
  });

  it("adds the year when the latest month is in an earlier year", () => {
    expect(fallbackNote("2026-01", "2025-12")).toBe(
      "No payments in January yet. Showing December 2025, the latest month with payments.",
    );
  });
});
