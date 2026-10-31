import { describe, expect, it } from "vitest";
import { clientKeyOf, isSameClient } from "@/lib/risk/client-key";
import { scoreClient } from "@/lib/risk/score";
import { BRIGHTWELL, OKAFOR, openInvoice, overdueInvoice, paidInvoice } from "../support/summaries";

const TODAY = "2026-10-31";
const NORTHPINE = { name: "Northpine Studio", email: "billing@northpine.example.com" };
const HALDEN = { name: "Halden Coffee Co.", email: "mike@haldencoffee.example" };

describe("scoreClient", () => {
  it("has nothing to say about a client with no history", () => {
    expect(scoreClient([], TODAY)).toEqual({
      invoicesConsidered: 0,
      lateCount: 0,
      averageDaysLate: 0,
      level: "reliable",
      suggestion: null,
      reason: "No earlier invoices to this client.",
    });
  });

  it("does not count an invoice that is open and not yet due", () => {
    const score = scoreClient([openInvoice("2026-11-20")], TODAY);
    expect(score.invoicesConsidered).toBe(0);
    expect(score.level).toBe("reliable");
  });

  it("calls a client who always paid on time reliable", () => {
    const score = scoreClient(
      [
        paidInvoice("2026-10-16", "2026-10-15", HALDEN),
        paidInvoice("2026-10-08", "2026-10-08", HALDEN),
        openInvoice("2026-11-30", HALDEN),
      ],
      TODAY,
    );
    expect(score).toMatchObject({
      invoicesConsidered: 2,
      lateCount: 0,
      level: "reliable",
      suggestion: null,
      reason: "Halden Coffee Co. has paid on time.",
    });
  });

  it("puts a client with one late payment on watch and suggests 1%", () => {
    const score = scoreClient(
      [paidInvoice("2026-09-10", "2026-09-20"), paidInvoice("2026-10-01", "2026-10-01")],
      TODAY,
    );
    expect(score).toMatchObject({ lateCount: 1, averageDaysLate: 10, level: "watch" });
    expect(score.suggestion).toEqual({
      kind: "early_payment_discount",
      percent: 1,
      withinDays: 7,
    });
  });

  it("makes a late payer of a client with two late payments averaging 5 days or more", () => {
    const score = scoreClient(
      [
        paidInvoice("2026-08-01", "2026-08-13"),
        paidInvoice("2026-09-01", "2026-09-17"),
        paidInvoice("2026-09-20", "2026-09-20"),
      ],
      TODAY,
    );
    expect(score).toMatchObject({
      invoicesConsidered: 3,
      lateCount: 2,
      averageDaysLate: 14,
      level: "late_payer",
      reason: "Okafor & Reyes paid 2 of 3 invoices late, 14 days on average.",
    });
    expect(score.suggestion).toEqual({
      kind: "early_payment_discount",
      percent: 2,
      withinDays: 7,
    });
  });

  it("keeps two small delays on watch", () => {
    const score = scoreClient(
      [paidInvoice("2026-09-01", "2026-09-04"), paidInvoice("2026-10-01", "2026-10-04")],
      TODAY,
    );
    expect(score).toMatchObject({ lateCount: 2, averageDaysLate: 3, level: "watch" });
  });

  it("makes a late payer of a client with an invoice more than 30 days overdue", () => {
    const score = scoreClient([overdueInvoice("2026-09-20", 41, NORTHPINE)], TODAY);
    expect(score).toMatchObject({ lateCount: 1, averageDaysLate: 41, level: "late_payer" });
  });

  it("describes a single overdue invoice by its days overdue", () => {
    const score = scoreClient([overdueInvoice("2026-10-20", 11, NORTHPINE)], TODAY);
    expect(score.level).toBe("watch");
    expect(score.reason).toBe("Northpine Studio has one invoice 11 days overdue.");
  });

  it("counts an overdue invoice and a late payment together", () => {
    const score = scoreClient(
      [paidInvoice("2026-08-01", "2026-08-11"), overdueInvoice("2026-10-11", 20)],
      TODAY,
    );
    expect(score).toMatchObject({ lateCount: 2, averageDaysLate: 15, level: "late_payer" });
    expect(score.reason).toBe("Okafor & Reyes was late on 2 of 2 invoices, 15 days on average.");
  });

  it("treats a payment one day late as reliable", () => {
    const score = scoreClient([paidInvoice("2026-10-10", "2026-10-11")], TODAY);
    expect(score).toMatchObject({ lateCount: 1, averageDaysLate: 1, level: "reliable" });
    expect(score.suggestion).toBeNull();
    expect(score.reason).toBe("Okafor & Reyes has never been more than 2 days late.");
  });

  it("rounds the average to one decimal", () => {
    const score = scoreClient(
      [paidInvoice("2026-09-01", "2026-09-07"), paidInvoice("2026-10-01", "2026-10-04")],
      TODAY,
    );
    expect(score.averageDaysLate).toBe(4.5);
  });
});

describe("client identity", () => {
  it("matches a name after trimming, collapsing spaces and ignoring case", () => {
    expect(isSameClient(OKAFOR, "BUYER@personal.example.com ", "  okafor   &  REYES ")).toBe(true);
  });

  it("matches by email alone when no name is given", () => {
    expect(isSameClient(OKAFOR, "buyer@personal.example.com")).toBe(true);
    expect(isSameClient(OKAFOR, "other@example.com")).toBe(false);
  });

  it("tells two clients that share one sandbox email apart", () => {
    expect(isSameClient(BRIGHTWELL, OKAFOR.email, OKAFOR.name)).toBe(false);
    expect(clientKeyOf(BRIGHTWELL)).not.toBe(clientKeyOf(OKAFOR));
  });

  it("scores each of two clients sharing an email from its own invoices", () => {
    const all = [
      paidInvoice("2026-08-01", "2026-08-13", OKAFOR),
      paidInvoice("2026-09-01", "2026-09-17", OKAFOR),
      paidInvoice("2026-09-01", "2026-08-30", BRIGHTWELL),
    ];
    const of = (client: typeof OKAFOR) =>
      scoreClient(
        all.filter((invoice) => isSameClient(invoice.client, client.email, client.name)),
        TODAY,
      );
    expect(of(OKAFOR).level).toBe("late_payer");
    expect(of(BRIGHTWELL).level).toBe("reliable");
  });
});
