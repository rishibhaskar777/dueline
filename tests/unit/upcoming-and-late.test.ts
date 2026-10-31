import { describe, expect, it } from "vitest";
import { groupClients } from "@/lib/clients/group-clients";
import { lateClients, upcomingDue } from "@/lib/insights/upcoming";
import type { Client, InvoiceSummary } from "@/types";
import { BRIGHTWELL, OKAFOR, openInvoice, overdueInvoice, paidInvoice } from "../support/summaries";

const TODAY = "2026-11-05";
const NORTHPINE: Client = { name: "Northpine Studio", email: "buyer@personal.example.com" };
const HALDEN: Client = { name: "Halden", email: "buyer@personal.example.com" };
const TANDEM: Client = { name: "Tandem", email: "buyer@personal.example.com" };

const withRupees = (invoice: InvoiceSummary, payoutInr: number): InvoiceSummary => ({
  ...invoice,
  payoutInr,
});

describe("upcomingDue", () => {
  it("lists unpaid invoices due within 14 days, soonest first, from today", () => {
    const later = openInvoice("2026-11-19", BRIGHTWELL);
    const soon = openInvoice("2026-11-06", OKAFOR);
    const today = openInvoice("2026-11-05", NORTHPINE);
    const tooFar = openInvoice("2026-11-20", OKAFOR);
    const rows = upcomingDue([later, tooFar, soon, today], TODAY);

    expect(rows.map(({ dueOn }) => dueOn)).toEqual(["2026-11-05", "2026-11-06", "2026-11-19"]);
    expect(rows[0]).toMatchObject({ clientName: "Northpine Studio", invoiceId: today.id });
  });

  it("leaves out paid and overdue invoices", () => {
    const rows = upcomingDue(
      [
        paidInvoice("2026-11-08", "2026-11-01"),
        overdueInvoice("2026-11-01", 4),
        openInvoice("2026-11-08"),
      ],
      TODAY,
    );
    expect(rows).toHaveLength(1);
  });

  it("is empty with nothing due", () => {
    expect(upcomingDue([], TODAY)).toEqual([]);
  });
});

describe("lateClients", () => {
  it("ranks clients by their most overdue unpaid invoice and shows the top three", () => {
    const invoices = [
      withRupees(overdueInvoice("2026-10-26", 10, OKAFOR), 8000),
      withRupees(overdueInvoice("2026-10-31", 5, OKAFOR), 2000),
      withRupees(overdueInvoice("2026-11-02", 3, BRIGHTWELL), 4000),
      withRupees(overdueInvoice("2026-10-01", 35, NORTHPINE), 1000),
      withRupees(overdueInvoice("2026-11-04", 1, HALDEN), 500),
      openInvoice("2026-12-01", TANDEM),
    ];
    const late = lateClients(groupClients(invoices, false, TODAY));

    expect(late.map(({ name, daysLate }) => [name, daysLate])).toEqual([
      ["Northpine Studio", 35],
      ["Okafor & Reyes", 10],
      ["Brightwell Labs", 3],
    ]);
    expect(late[1]).toMatchObject({ key: "okafor-reyes", overdueInr: 10_000 });
  });

  it("carries the risk level and a reason that says how few invoices it rests on", () => {
    const invoices = [overdueInvoice("2026-10-01", 35, NORTHPINE)];
    const [client] = lateClients(groupClients(invoices, false, TODAY));
    expect(client.riskLevel).toBe("late_payer");
    expect(client.reason).toContain("Based on 1 invoice.");
  });

  it("is empty when nobody is overdue", () => {
    expect(lateClients(groupClients([openInvoice("2026-12-01")], false, TODAY))).toEqual([]);
  });
});
