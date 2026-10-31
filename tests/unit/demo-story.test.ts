import { describe, expect, it } from "vitest";
import { daysBetween } from "@/lib/date-math";
import { buildDemoStory, demoMemo, isDemoMemo, type DemoInvoice } from "@/lib/demo/story";
import { scoreClient } from "@/lib/risk/score";
import type { InvoiceSummary } from "@/types";

const TODAY = "2026-10-31";
const story = buildDemoStory(TODAY);

function summaryOf(invoice: DemoInvoice): InvoiceSummary {
  const dueState = invoice.paidOn ? "paid" : TODAY > invoice.dueOn ? "overdue" : "on_time";
  return {
    id: invoice.key,
    number: invoice.key,
    client: { name: invoice.clientName, email: "buyer@personal.example.com" },
    work: invoice.work,
    amount: invoice.amount,
    issuedOn: invoice.issuedOn,
    dueOn: invoice.dueOn,
    paidOn: invoice.paidOn,
    paypalStatus: invoice.paidOn ? "MARKED_AS_PAID" : "UNPAID",
    dueState,
    daysLate: 0,
    payoutInr: null,
    payoutSource: null,
    rateDate: null,
    actualPayout: null,
    purposeCode: invoice.purposeCode,
    payLink: "",
    riskLevel: null,
  };
}

function levelOf(clientName: string): string {
  const invoices = story.filter((invoice) => invoice.clientName === clientName).map(summaryOf);
  return scoreClient(invoices, TODAY).level;
}

describe("buildDemoStory", () => {
  it("gives every invoice its own key and memo", () => {
    const keys = story.map((invoice) => invoice.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(new Set(keys.map((key) => demoMemo(key))).size).toBe(keys.length);
    expect(isDemoMemo(demoMemo(keys[0]))).toBe(true);
    expect(isDemoMemo("dueline-request:abc")).toBe(false);
    expect(isDemoMemo(undefined)).toBe(false);
  });

  it("places every date relative to the day it is built for", () => {
    const next = buildDemoStory("2026-11-14");
    story.forEach((invoice, index) => {
      expect(daysBetween(invoice.issuedOn, next[index].issuedOn)).toBe(14);
      expect(daysBetween(invoice.dueOn, next[index].dueOn)).toBe(14);
    });
  });

  it("records Okafor & Reyes' two older invoices as paid 12 and 16 days after they fell due", () => {
    const older = story.filter(
      (invoice) => invoice.clientName === "Okafor & Reyes" && invoice.paidOn,
    );
    expect(older.map((invoice) => daysBetween(invoice.issuedOn, TODAY))).toEqual([75, 45]);
    expect(older.map((invoice) => daysBetween(invoice.dueOn, invoice.paidOn ?? ""))).toEqual([
      12, 16,
    ]);
  });

  it("never records a payment before the invoice was issued or after today", () => {
    for (const invoice of story.filter((item) => item.paidOn)) {
      expect(daysBetween(invoice.issuedOn, invoice.paidOn ?? "")).toBeGreaterThan(0);
      expect(daysBetween(invoice.paidOn ?? "", TODAY)).toBeGreaterThanOrEqual(0);
    }
  });

  it("leaves Northpine Studio due soon and Tandem Health on time", () => {
    const due = (name: string): string =>
      story.find((invoice) => invoice.clientName === name)?.dueOn ?? "";
    expect(daysBetween(TODAY, due("Northpine Studio"))).toBe(3);
    expect(daysBetween(TODAY, due("Tandem Health"))).toBeGreaterThan(3);
  });

  it("makes Okafor & Reyes a late payer, Brightwell Labs a watch and Halden Coffee Co. reliable", () => {
    expect(levelOf("Okafor & Reyes")).toBe("late_payer");
    expect(levelOf("Brightwell Labs")).toBe("watch");
    expect(levelOf("Halden Coffee Co.")).toBe("reliable");
  });
});
