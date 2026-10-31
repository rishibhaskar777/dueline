import { beforeEach, describe, expect, it, vi } from "vitest";
import { clientKeyOf } from "@/lib/risk/client-key";
import { getClientRisk, riskByClient } from "@/lib/risk/client-risk";
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

describe("riskByClient", () => {
  it("gives each client its own level and leaves out clients with nothing to judge", () => {
    const levels = riskByClient([
      ...summaries,
      openInvoice("2026-11-20", { name: "Fresh", email: "f@x.co" }),
    ]);
    expect(levels.get(clientKeyOf(OKAFOR))).toBe("late_payer");
    expect(levels.get(clientKeyOf(BRIGHTWELL))).toBe("watch");
    expect(levels.has(clientKeyOf({ name: "Fresh", email: "f@x.co" }))).toBe(false);
  });
});
