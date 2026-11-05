import { describe, expect, it } from "vitest";
import {
  bankGridTotals,
  paypalGridTotals,
  totalsLines,
  totalsRowHeight,
} from "@/components/export/grid-totals";
import { gridCsvFileName } from "@/components/export/grid-export";
import { protectFormula } from "@/lib/export/csv-text";
import type { ExportOutsideRow, ExportRegisterRow, Money } from "@/types";

function paypalRow(
  invoiceNumber: string,
  currency: "USD" | "EUR",
  foreign: string,
  fee: string | null,
  net: string | null,
  inrReceived: number,
): ExportRegisterRow {
  return {
    invoiceId: invoiceNumber,
    invoiceNumber,
    clientName: "Client",
    clientCountry: null,
    paidOn: "2026-10-12",
    foreign: { currency, value: foreign },
    fee: fee ? { currency, value: fee } : null,
    net: net ? { currency, value: net } : null,
    inrReceived,
    inrSource: "paypal",
    rateUsed: null,
    rateDate: null,
    purposeCode: null,
    sac: null,
    underLut: true,
    transactionId: null,
  };
}

const usdRows = [
  paypalRow("INV-1", "USD", "450.00", "20.10", "429.90", 36_000),
  paypalRow("INV-2", "USD", "100.10", "4.71", "95.39", 7_900),
  paypalRow("INV-3", "USD", "0.30", "0.00", "0.30", 20),
];

describe("paypalGridTotals", () => {
  it("counts the rows and adds rupees, amounts, fees and net as the rows show them", () => {
    const totals = paypalGridTotals(usdRows, "2026-10");
    expect(totals.label).toBe("Total for October 2026");
    expect(totals.payments).toBe("3 payments");
    expect(totals.rupees).toBe(43_920);
    expect(totals.amount).toEqual([{ currency: "USD", value: "550.40" }]);
    expect(totals.fee).toEqual([{ currency: "USD", value: "24.81" }]);
    expect(totals.net).toEqual([{ currency: "USD", value: "525.59" }]);
  });

  it("adds without floating point drift", () => {
    const rows = ["0.10", "0.20", "0.30"].map((value, index) =>
      paypalRow(`INV-${index}`, "USD", value, null, null, 1),
    );
    expect(paypalGridTotals(rows, "2026-10").amount).toEqual([{ currency: "USD", value: "0.60" }]);
  });

  it("keeps one line for each currency, in the order they first appear", () => {
    const totals = paypalGridTotals(
      [
        paypalRow("INV-1", "EUR", "610.00", "27.19", "582.81", 52_000),
        ...usdRows,
        paypalRow("INV-5", "EUR", "10.00", "0.79", "9.21", 800),
      ],
      "2026-10",
    );
    expect(totals.amount).toEqual([
      { currency: "EUR", value: "620.00" },
      { currency: "USD", value: "550.40" },
    ]);
    expect(totalsLines(totals, "Net")).toEqual(["€592.02", "$525.59"]);
    expect(totalsLines(totals, "Amount")).toEqual(["€620.00", "$550.40"]);
  });

  it("leaves out a fee PayPal has not reported instead of counting it as nothing", () => {
    const totals = paypalGridTotals(
      [paypalRow("INV-1", "USD", "450.00", null, null, 36_000)],
      "2026-10",
    );
    expect(totals.fee).toEqual([]);
    expect(totalsLines(totals, "Fee")).toEqual(["–"]);
  });

  it("says 1 payment, and has nothing to add for no payments", () => {
    expect(paypalGridTotals(usdRows.slice(0, 1), "2026-10").payments).toBe("1 payment");
    const none = paypalGridTotals([], "2026-10");
    expect(none).toMatchObject({ payments: "0 payments", rupees: 0, amount: [] });
  });
});

describe("bankGridTotals", () => {
  const rows: ExportOutsideRow[] = [
    { ...usdRows[0], bankReference: null },
    { ...usdRows[1], bankReference: "FIRC/2026/001" },
  ].map(({ fee, net, transactionId, ...row }) => {
    void fee;
    void net;
    void transactionId;
    return row as ExportOutsideRow;
  });

  it("counts the payments and adds the rupees, and has no fee or net", () => {
    const totals = bankGridTotals(rows, "2026-10");
    expect(totals.payments).toBe("2 payments");
    expect(totals.rupees).toBe(43_900);
    expect(totalsLines(totals, "Rupees")).toEqual(["₹43,900"]);
    expect(totals.amount).toEqual([]);
  });
});

describe("totalsLines and totalsRowHeight", () => {
  const totals = paypalGridTotals(usdRows, "2026-10");

  it("puts the label and the count under Paid on, and nothing under the other columns", () => {
    expect(totalsLines(totals, "Paid on")).toEqual(["Total for October 2026", "3 payments"]);
    expect(totalsLines(totals, "Rupees")).toEqual(["₹43,920"]);
    expect(totalsLines(totals, "Transaction ID")).toEqual([]);
    expect(totalsLines(totals, "Code")).toEqual([]);
  });

  it("is two lines tall, or one line for each currency when there are more", () => {
    const three: Money[] = [
      { currency: "USD", value: "1.00" },
      { currency: "EUR", value: "1.00" },
      { currency: "GBP", value: "1.00" },
    ];
    expect(totalsRowHeight(totals)).toBe(64);
    expect(totalsRowHeight({ ...totals, amount: three })).toBe(86);
  });
});

describe("the grid's CSV", () => {
  it("is named for the grid and the month", () => {
    expect(gridCsvFileName("paypal", "2026-10")).toBe("dueline-paypal-2026-10.csv");
    expect(gridCsvFileName("bank", "2026-10")).toBe("dueline-bank-2026-10.csv");
  });

  it("defuses a cell that a spreadsheet would run as a formula", () => {
    expect(protectFormula("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(protectFormula("-5")).toBe("'-5");
    expect(protectFormula("Halden Coffee Co.")).toBe("Halden Coffee Co.");
  });
});
