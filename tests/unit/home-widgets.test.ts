import { describe, expect, it } from "vitest";
import { nextStep, nextStepText } from "@/components/dashboard/checklist-steps";
import { bestCaseLine, expectedShare } from "@/components/dashboard/forecast-summary";
import { lateHistoryLine, latePill, overdueLine } from "@/components/dashboard/late-client-pill";
import { featuredRate, mostOutstandingCurrency } from "@/components/dashboard/rate-line";
import { invoiceCount, openInvoiceCount, paidNote } from "@/components/receivables/totals-notes";
import { tandemInvoice } from "@/mocks/fixtures";
import type {
  ChecklistItem,
  Forecast,
  InvoiceSummary,
  LateClient,
  RatesWidget,
  Totals,
} from "@/types";

function invoice(overrides: Partial<InvoiceSummary>): InvoiceSummary {
  return { ...tandemInvoice, ...overrides };
}

const bucket = (expectedInr: number, bestCaseInr: number, invoices: number) => ({
  label: "x",
  expectedInr,
  bestCaseInr,
  invoices,
});

function forecast(...buckets: ReturnType<typeof bucket>[]): Forecast {
  return { buckets, basis: "basis" };
}

describe("openInvoiceCount", () => {
  it("counts every invoice that is not paid", () => {
    const list = [
      invoice({ id: "a", dueState: "overdue" }),
      invoice({ id: "b", dueState: "due_soon" }),
      invoice({ id: "c", dueState: "on_time" }),
      invoice({ id: "d", dueState: "paid" }),
    ];
    expect(openInvoiceCount(list)).toBe(3);
    expect(openInvoiceCount([])).toBe(0);
  });

  it("is worded for one and many", () => {
    expect(invoiceCount(1)).toBe("1 invoice");
    expect(invoiceCount(4)).toBe("4 invoices");
  });
});

describe("paidNote", () => {
  const totals: Totals = {
    outstandingInr: 0,
    overdueInr: 0,
    overdueCount: 0,
    paidLast30Inr: 171249,
    paidLast30PayPalInr: 79049,
    paidLast30OutsideInr: 92200,
  };

  it("splits the rupees between PayPal and the bank", () => {
    expect(paidNote(totals)).toBe("₹79,049 through PayPal · ₹92,200 by bank");
  });

  it("leaves the bank out when nothing came that way", () => {
    expect(paidNote({ ...totals, paidLast30OutsideInr: 0 })).toBe("₹79,049 through PayPal");
  });
});

describe("bestCaseLine", () => {
  it("says nothing is due later when the later windows are empty", () => {
    expect(
      bestCaseLine(forecast(bucket(194695, 244713, 4), bucket(0, 0, 0), bucket(0, 0, 0))),
    ).toBe("Best case ₹2,44,713 · nothing due after 30 days");
  });

  it("adds what the later windows hold", () => {
    expect(
      bestCaseLine(forecast(bucket(100, 200, 1), bucket(0, 3000, 1), bucket(0, 1000, 1))),
    ).toBe("Best case ₹200 · ₹4,000 more in 31 to 90 days");
  });
});

describe("expectedShare", () => {
  it("is the expected part of the best case", () => {
    expect(expectedShare(bucket(80, 100, 1))).toBe(0.8);
    expect(expectedShare(bucket(0, 0, 0))).toBe(0);
  });
});

describe("latePill", () => {
  const client: LateClient = {
    key: "a",
    name: "A",
    daysLate: 8,
    overdueInr: 1,
    riskLevel: "late_payer",
    reason: "",
    lateCount: 3,
    invoicesConsidered: 3,
    averageDaysLate: 12,
  };

  it("counts the late invoices and gives the average days", () => {
    expect(lateHistoryLine(client)).toBe("Late on 3 of 3 · 12 days on average");
  });

  it("says one day in the singular", () => {
    expect(lateHistoryLine({ ...client, lateCount: 1, averageDaysLate: 1 })).toBe(
      "Late on 1 of 3 · 1 day on average",
    );
  });

  it("leaves the average out when there is none", () => {
    expect(lateHistoryLine({ ...client, averageDaysLate: 0 })).toBe("Late on 3 of 3");
  });

  it("says how late the most overdue open invoice is", () => {
    expect(latePill(client)).toBe("8 days late");
    expect(latePill({ ...client, daysLate: 1 })).toBe("1 day late");
  });

  it("has no pill when nothing is open and late", () => {
    expect(latePill({ ...client, daysLate: 0 })).toBeNull();
  });

  it("gives only the money when three or more invoices are behind the reading", () => {
    expect(overdueLine({ ...client, overdueInr: 71038 })).toBe("About ₹71,038 overdue.");
  });

  it("adds the basis when it is thin", () => {
    expect(overdueLine({ ...client, overdueInr: 71038, invoicesConsidered: 2 })).toBe(
      "About ₹71,038 overdue. Based on 2 invoices.",
    );
    expect(overdueLine({ ...client, overdueInr: 5000, invoicesConsidered: 1 })).toBe(
      "About ₹5,000 overdue. Based on 1 invoice.",
    );
  });
});

describe("the rate line", () => {
  const rates: RatesWidget = {
    onDate: "2026-11-02",
    source: "ecb",
    hasAverage: true,
    lines: [
      { currency: "USD", rate: 94.96, percentVsAverage: -0.6 },
      { currency: "EUR", rate: 110.1, percentVsAverage: 1.2 },
    ],
  };

  it("picks the currency with the most rupees outstanding, USD when none", () => {
    const list = [
      invoice({ id: "a", amount: { currency: "EUR", value: "10.00" }, payoutInr: 900 }),
      invoice({ id: "b", amount: { currency: "USD", value: "10.00" }, payoutInr: 500 }),
      invoice({
        id: "c",
        amount: { currency: "GBP", value: "10.00" },
        payoutInr: 5000,
        dueState: "paid",
      }),
    ];
    expect(mostOutstandingCurrency(list)).toBe("EUR");
    expect(mostOutstandingCurrency([])).toBe("USD");
  });

  it("compares the rate with its 30-day average", () => {
    expect(featuredRate(rates, [], [])?.text).toBe("USD ₹94.96 · 0.6% below its 30-day average");
    const eur = [invoice({ amount: { currency: "EUR", value: "1.00" }, payoutInr: 10 })];
    expect(featuredRate(rates, [], eur)?.text).toBe("EUR ₹110.10 · 1.2% above its 30-day average");
  });

  it("leaves the comparison out without an average, and the line out without rates", () => {
    const bare: RatesWidget = {
      ...rates,
      hasAverage: false,
      lines: [{ currency: "USD", rate: 94.96, percentVsAverage: null }],
    };
    expect(featuredRate(bare, [], [])?.text).toBe("USD ₹94.96");
    expect(featuredRate({ ...rates, lines: [] }, [], [])).toBeNull();
  });

  it("carries only the alerts of the shown currency", () => {
    const alerts = [
      { currency: "USD", direction: "below", threshold: 95, rate: 94.96 },
      { currency: "EUR", direction: "above", threshold: 100, rate: 110.1 },
    ] as const;
    expect(featuredRate(rates, [...alerts], [])?.alerts).toEqual([alerts[0]]);
  });
});

describe("checklist steps", () => {
  const items: ChecklistItem[] = [
    { id: "profile", label: "Fill in your business profile", done: true, href: "/profile" },
    {
      id: "first_export",
      label: "Download your first export register",
      done: false,
      href: "/export",
    },
  ];

  it("offers the first step that is not done", () => {
    expect(nextStep(items)?.id).toBe("first_export");
    expect(nextStep([items[0]])).toBeNull();
  });

  it("reads the step on after Next:", () => {
    expect(nextStepText(items[1])).toBe("Next: download your first export register →");
  });
});
