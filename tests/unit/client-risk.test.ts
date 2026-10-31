import { beforeEach, describe, expect, it, vi } from "vitest";
import { getClientRisk, riskLevelsById } from "@/lib/risk/client-risk";
import { stubEnv } from "../support/env";
import { BRIGHTWELL, OKAFOR, openInvoice, overdueInvoice, paidInvoice } from "../support/summaries";

const loader = vi.hoisted(() => ({ loadInvoices: vi.fn() }));
vi.mock("@/lib/paypal/summaries", () => ({ loadInvoices: loader.loadInvoices }));

const summaries = [
  paidInvoice("2026-08-01", "2026-08-13", OKAFOR),
  paidInvoice("2026-09-01", "2026-09-17", OKAFOR),
  overdueInvoice("2026-10-20", 11, BRIGHTWELL),
  openInvoice("2026-11-20", BRIGHTWELL),
];

beforeEach(() => {
  stubEnv({ DEMO_TODAY: "2026-10-31" });
  loader.loadInvoices.mockReset();
  loader.loadInvoices.mockResolvedValue(
    summaries.map((summary) => ({
      summary,
      amountDue: summary.amount,
      underLut: false,
      paymentId: null,
    })),
  );
});

describe("getClientRisk", () => {
  it("reads the history of the client with that name and email", async () => {
    const risk = await getClientRisk(OKAFOR.email, "okafor & reyes");
    expect(risk).toMatchObject({
      clientEmail: OKAFOR.email,
      clientName: "Okafor & Reyes",
      invoicesConsidered: 2,
      level: "late_payer",
    });
  });

  it("keeps two clients that share an email apart", async () => {
    const risk = await getClientRisk(BRIGHTWELL.email, "Brightwell Labs");
    expect(risk).toMatchObject({ clientName: "Brightwell Labs", invoicesConsidered: 1 });
    expect(risk.reason).toBe("Brightwell Labs has one invoice 11 days overdue.");
  });

  it("reports no history for an email it has never invoiced", async () => {
    const risk = await getClientRisk("new@client.example", "Newcomer Ltd");
    expect(risk).toEqual({
      clientEmail: "new@client.example",
      clientName: "Newcomer Ltd",
      invoicesConsidered: 0,
      lateCount: 0,
      averageDaysLate: 0,
      level: "reliable",
      suggestion: null,
      reason: "No earlier invoices to this client.",
    });
  });

  it("uses every invoice to the email when no name is given", async () => {
    const risk = await getClientRisk(OKAFOR.email);
    expect(risk.invoicesConsidered).toBe(3);
  });
});

describe("getClientRisk matching", () => {
  it("finds a client's history under a new email by its business name", async () => {
    for (const DEMO_MODE of ["true", "false"]) {
      stubEnv({ DEMO_TODAY: "2026-10-31", DEMO_MODE });
      const risk = await getClientRisk("accounts@brightwell.example.com", "Brightwell Labs");
      expect(risk).toMatchObject({ clientName: "Brightwell Labs", invoicesConsidered: 1 });
    }
  });

  it("finds a client's history under a new name by its email outside the demo", async () => {
    stubEnv({ DEMO_TODAY: "2026-10-31", DEMO_MODE: "false" });
    const risk = await getClientRisk(OKAFOR.email, "Okafor Reyes Ltd");
    expect(risk.invoicesConsidered).toBe(3);
  });

  it("keeps the shared sandbox email from joining clients in the demo", async () => {
    stubEnv({ DEMO_TODAY: "2026-10-31", DEMO_MODE: "true" });
    const risk = await getClientRisk(OKAFOR.email, "Somebody Else");
    expect(risk.invoicesConsidered).toBe(0);
  });
});

describe("riskLevelsById", () => {
  it("gives each invoice its client's level and leaves out clients with nothing to judge", () => {
    const fresh = openInvoice("2026-11-20", { name: "Fresh", email: "f@x.co" });
    const levels = riskLevelsById([...summaries, fresh]);
    expect(levels.get(summaries[0].id)).toBe("late_payer");
    expect(levels.get(summaries[2].id)).toBe("watch");
    expect(levels.has(fresh.id)).toBe(false);
  });

  it("joins invoices of one business name sent to different emails", () => {
    const moved = paidInvoice("2026-09-01", "2026-09-17", {
      name: "Okafor & Reyes",
      email: "new@okafor.example.com",
    });
    const levels = riskLevelsById([...summaries, moved]);
    expect(levels.get(moved.id)).toBe("late_payer");
  });
});
