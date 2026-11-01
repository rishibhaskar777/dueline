import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyAliases,
  checkMerge,
  MERGE_REFUSAL_TEXT,
  resolveClientName,
} from "@/lib/clients/aliases";
import { getClientDetail, listClients, mergeClient, unmergeClient } from "@/lib/clients/clients";
import { ClientMergeError, ClientNotFoundError } from "@/lib/clients/errors";
import { riskScoresById } from "@/lib/risk/client-risk";
import { createMemoryStore } from "@/lib/store/memory-store";
import type { ClientAlias, Store } from "@/lib/store/store";
import type { Client, InvoiceSummary } from "@/types";
import { stubEnv } from "../support/env";
import { OKAFOR, openInvoice, overdueInvoice, paidInvoice } from "../support/summaries";

const NORTHPINE: Client = { name: "Northpine Studio", email: "buyer@personal.example.com" };
const MAYA: Client = { name: "Maya Studio", email: "maya@new.example" };

let store: Store;
let raw: InvoiceSummary[];

vi.mock("@/lib/store", () => ({ getStore: () => store }));
// Every screen's data comes through here; the real loader applies the aliases after PayPal's list.
vi.mock("@/lib/payouts/load-summaries", () => ({
  loadSummaries: async () =>
    applyAliases(
      raw.map((summary) => ({ summary })),
      await store.listClientAliases(),
    ).map(({ summary }) => summary),
}));

function alias(fromKey: string, intoKey: string): ClientAlias {
  return { fromKey, intoKey, fromName: fromKey, fromEmail: "x@y.example" };
}

beforeEach(() => {
  store = createMemoryStore();
  stubEnv({ DEMO_TODAY: "2026-10-31" });
  raw = [
    paidInvoice("2026-08-01", "2026-08-13", OKAFOR),
    paidInvoice("2026-09-01", "2026-09-17", OKAFOR),
    overdueInvoice("2026-10-20", 11, MAYA),
    openInvoice("2026-11-20", NORTHPINE),
  ];
});

describe("checkMerge", () => {
  it("allows a merge between two clients that stand alone", () => {
    expect(checkMerge([], "maya-studio", "okafor-reyes")).toBeNull();
  });

  it("refuses to merge a client into itself", () => {
    expect(checkMerge([], "okafor-reyes", "okafor-reyes")).toBe("same_client");
  });

  it("refuses a chain: into a client that was merged away", () => {
    const aliases = [alias("maya-studio", "okafor-reyes")];
    expect(checkMerge(aliases, "northpine-studio", "maya-studio")).toBe("target_is_merged");
  });

  it("refuses a chain: a client that others were merged into", () => {
    const aliases = [alias("maya-studio", "okafor-reyes")];
    expect(checkMerge(aliases, "okafor-reyes", "northpine-studio")).toBe("source_has_merges");
  });
});

describe("applyAliases", () => {
  const loaded = [
    { summary: paidInvoice("2026-08-01", "2026-08-13", OKAFOR) },
    { summary: overdueInvoice("2026-10-20", 11, MAYA) },
  ];

  it("gives a merged client's invoices the other client's name and keeps their own email", () => {
    const merged = applyAliases(loaded, [alias("maya-studio", "okafor-reyes")]);
    expect(merged.map(({ summary }) => summary.client)).toEqual([
      OKAFOR,
      { name: "Okafor & Reyes", email: "maya@new.example" },
    ]);
  });

  it("leaves everything alone with no aliases, and ignores one whose target has no invoices", () => {
    expect(applyAliases(loaded, [])).toBe(loaded);
    expect(applyAliases(loaded, [alias("maya-studio", "gone-co")])).toEqual(loaded);
  });

  it("does not change the list it was given", () => {
    applyAliases(loaded, [alias("maya-studio", "okafor-reyes")]);
    expect(loaded[1].summary.client.name).toBe("Maya Studio");
  });
});

describe("resolveClientName", () => {
  const summaries = [paidInvoice("2026-08-01", "2026-08-13", OKAFOR)];

  it("sends a merged client's typed name to the client it was merged into", () => {
    const aliases = [alias("maya-studio", "okafor-reyes")];
    expect(resolveClientName("  Maya  Studio ", aliases, summaries)).toBe("Okafor & Reyes");
  });

  it("keeps any other name, and no name", () => {
    expect(resolveClientName("Newcomer", [], summaries)).toBe("Newcomer");
    expect(resolveClientName(undefined, [], summaries)).toBeUndefined();
  });
});

describe("a merged client keeps its own country and email", () => {
  const halden: Client = { name: "Halden Coffee Co.", email: "mike@halden.example", country: "US" };
  const northpine: Client = {
    name: "Northpine Studio",
    email: "ana@northpine.example",
    country: "CA",
  };

  beforeEach(() => {
    raw = [
      paidInvoice("2026-08-01", "2026-08-02", halden),
      paidInvoice("2026-09-01", "2026-09-02", halden),
      // The merged client's invoice is the newest, which must not make it speak for Halden.
      { ...paidInvoice("2026-10-01", "2026-10-02", northpine), issuedOn: "2026-10-01" },
    ];
  });

  it("shows the target's country and email after the merge", async () => {
    await mergeClient("northpine-studio", "halden-coffee-co");
    const detail = await getClientDetail("halden-coffee-co");

    expect(detail.client.country).toBe("US");
    expect(detail.client.email).toBe("mike@halden.example");
    expect(detail.invoices).toHaveLength(3);
  });

  it("leaves each invoice with the country and email it was sent to", async () => {
    await mergeClient("northpine-studio", "halden-coffee-co");
    const { invoices } = await getClientDetail("halden-coffee-co");
    const merged = invoices.find((invoice) => invoice.mergedFrom);

    expect(merged?.mergedFrom).toBe("Northpine Studio");
    expect(merged?.client).toEqual({ ...northpine, name: "Halden Coffee Co." });
  });

  it("keeps saying what the reading rests on, even with four or more invoices", async () => {
    raw.push(
      paidInvoice("2026-07-01", "2026-07-02", halden),
      paidInvoice("2026-06-01", "2026-06-02", halden),
    );
    expect((await getClientDetail("halden-coffee-co")).client.riskReason).not.toContain("Based on");

    await mergeClient("northpine-studio", "halden-coffee-co");
    expect((await getClientDetail("halden-coffee-co")).client.riskReason).toContain(
      "Based on 5 invoices.",
    );
  });
});

describe("risk after a merge", () => {
  it("counts the merged client's late invoice in the other client's reading", () => {
    const before = riskScoresById(raw);
    const okafor = raw[0];
    expect(before.get(okafor.id)?.level).toBe("late_payer");

    const merged = applyAliases(
      raw.map((summary) => ({ summary })),
      [alias("maya-studio", "okafor-reyes")],
    ).map(({ summary }) => summary);
    const after = riskScoresById(merged);
    expect(after.get(okafor.id)).toMatchObject({ invoicesConsidered: 3, lateCount: 3 });
    expect(after.get(raw[2].id)).toMatchObject({ invoicesConsidered: 3 });
  });
});

describe("mergeClient and unmergeClient", () => {
  it("merges a client into another and lists the clients as one", async () => {
    await mergeClient("maya-studio", "okafor-reyes");

    expect(await store.listClientAliases()).toEqual([
      {
        fromKey: "maya-studio",
        intoKey: "okafor-reyes",
        fromName: "Maya Studio",
        fromEmail: "maya@new.example",
      },
    ]);
    const clients = await listClients();
    expect(clients.map(({ key }) => key).sort()).toEqual(["northpine-studio", "okafor-reyes"]);
    expect(clients.find(({ key }) => key === "okafor-reyes")).toMatchObject({
      invoices: 3,
      riskLevel: "late_payer",
    });
  });

  it("shows the merged clients on the page of the client they went into", async () => {
    await mergeClient("maya-studio", "okafor-reyes");
    const detail = await getClientDetail("okafor-reyes");
    expect(detail.merged).toEqual([
      { key: "maya-studio", name: "Maya Studio", email: "maya@new.example" },
    ]);
    expect(detail.invoices).toHaveLength(3);
    expect((await getClientDetail("northpine-studio")).merged).toEqual([]);
  });

  it("refuses a chained merge and says why", async () => {
    await mergeClient("maya-studio", "okafor-reyes");
    await expect(mergeClient("northpine-studio", "maya-studio")).rejects.toThrow(
      ClientNotFoundError,
    );
    await expect(mergeClient("okafor-reyes", "northpine-studio")).rejects.toThrow(
      MERGE_REFUSAL_TEXT.source_has_merges,
    );
    await expect(mergeClient("okafor-reyes", "okafor-reyes")).rejects.toThrow(ClientMergeError);
    expect(await store.listClientAliases()).toHaveLength(1);
  });

  it("refuses an unknown client", async () => {
    await expect(mergeClient("nobody", "okafor-reyes")).rejects.toThrow(ClientNotFoundError);
    await expect(mergeClient("maya-studio", "nobody")).rejects.toThrow(ClientNotFoundError);
  });

  it("undoes a merge from the page of the client it went into", async () => {
    await mergeClient("maya-studio", "okafor-reyes");
    await unmergeClient("okafor-reyes", "maya-studio");

    expect(await store.listClientAliases()).toEqual([]);
    expect((await listClients()).map(({ key }) => key).sort()).toEqual([
      "maya-studio",
      "northpine-studio",
      "okafor-reyes",
    ]);
  });

  it("does not undo a merge that belongs to another client", async () => {
    await mergeClient("maya-studio", "okafor-reyes");
    await expect(unmergeClient("northpine-studio", "maya-studio")).rejects.toThrow(
      ClientNotFoundError,
    );
    expect(await store.listClientAliases()).toHaveLength(1);
  });

  it("lets the merge be made again after an undo", async () => {
    await mergeClient("maya-studio", "okafor-reyes");
    await unmergeClient("okafor-reyes", "maya-studio");
    await mergeClient("maya-studio", "northpine-studio");
    expect((await store.listClientAliases())[0].intoKey).toBe("northpine-studio");
  });
});
