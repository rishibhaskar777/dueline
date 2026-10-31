import { describe, expect, it } from "vitest";
import { groupClients } from "@/lib/clients/group-clients";
import { riskOf, summariseClient } from "@/lib/clients/summarise-client";
import { clientKey } from "@/lib/risk/client-key";
import { clientKeySchema, clientNotesRequestSchema, type InvoiceSummary } from "@/types";
import { BRIGHTWELL, OKAFOR, openInvoice, overdueInvoice, paidInvoice } from "../support/summaries";

const TODAY = "2026-11-05";

const withRupees = (invoice: InvoiceSummary, payoutInr: number): InvoiceSummary => ({
  ...invoice,
  payoutInr,
});

describe("clientKey", () => {
  it("makes a readable, address-safe key from the name", () => {
    expect(clientKey("Okafor & Reyes")).toBe("okafor-reyes");
    expect(clientKey("  Halden   Coffee Co. ")).toBe("halden-coffee-co");
    expect(clientKey("Café Lumière")).toBe("café-lumière");
  });

  it("gives the same key to names the radar treats as one client", () => {
    expect(clientKey("BRIGHTWELL  labs")).toBe(clientKey("Brightwell Labs"));
  });
});

describe("groupClients and summariseClient", () => {
  const invoices = [
    withRupees(paidInvoice("2026-08-14", "2026-08-26", OKAFOR), 40_000),
    withRupees(
      { ...paidInvoice("2026-09-14", "2026-10-02", OKAFOR), issuedOn: "2026-09-01" },
      30_000,
    ),
    withRupees(overdueInvoice("2026-10-29", 7, OKAFOR), 50_000),
    withRupees(openInvoice("2026-11-20", BRIGHTWELL), 20_000),
  ];

  it("makes one group per client, newest invoice first", () => {
    const groups = groupClients(invoices, false, TODAY);
    expect(groups.map(({ key }) => key)).toEqual(["okafor-reyes", "brightwell-labs"]);
    expect(groups[0].invoices.map(({ issuedOn }) => issuedOn)).toEqual([
      "2026-09-01",
      "2026-08-01",
      "2026-08-01",
    ]);
  });

  it("totals what was billed and what is outstanding, in rupees", () => {
    const [okafor] = groupClients(invoices, false, TODAY);
    expect(summariseClient(okafor)).toMatchObject({
      key: "okafor-reyes",
      name: "Okafor & Reyes",
      invoices: 3,
      billedInr: 120_000,
      outstandingInr: 50_000,
      lastPaidOn: "2026-10-02",
      riskLevel: "late_payer",
    });
  });

  it("says how many invoices a short history rests on", () => {
    const [okafor, brightwell] = groupClients(invoices, false, TODAY);
    const summary = summariseClient(brightwell);
    expect(summary.riskLevel).toBeNull();
    expect(summary.riskReason).toBe("No earlier invoices to this client.");
    expect(summary.lastPaidOn).toBeNull();
    expect(summariseClient(okafor).riskReason).toContain("Based on 3 invoices.");
  });

  it("groups by email too when an email identifies a client", () => {
    const renamed = { ...OKAFOR, name: "Okafor and Reyes Ltd" };
    const mixed = [
      overdueInvoice("2026-10-29", 7, OKAFOR),
      overdueInvoice("2026-10-29", 7, renamed),
    ];
    expect(groupClients(mixed, true, TODAY)).toHaveLength(1);
    expect(groupClients(mixed, false, TODAY)).toHaveLength(2);
  });

  it("reads the client's risk from the same score", () => {
    const [okafor] = groupClients(invoices, false, TODAY);
    expect(riskOf(okafor)).toMatchObject({
      clientEmail: OKAFOR.email,
      clientName: "Okafor & Reyes",
      level: "late_payer",
      invoicesConsidered: 3,
    });
  });
});

describe("client notes and keys in requests", () => {
  it("accepts notes of up to 1,000 characters, including none", () => {
    expect(clientNotesRequestSchema.safeParse({ notes: "" }).success).toBe(true);
    expect(clientNotesRequestSchema.safeParse({ notes: "a".repeat(1000) }).success).toBe(true);
  });

  it("refuses longer notes and missing ones", () => {
    expect(clientNotesRequestSchema.safeParse({ notes: "a".repeat(1001) }).success).toBe(false);
    expect(clientNotesRequestSchema.safeParse({}).success).toBe(false);
  });

  it("decodes a key that arrives percent-encoded", () => {
    expect(clientKeySchema.parse("caf%C3%A9-lumi%C3%A8re")).toBe("café-lumière");
    expect(clientKeySchema.safeParse("").success).toBe(false);
  });
});
