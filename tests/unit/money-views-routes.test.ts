import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as listClients } from "@/app/api/clients/route";
import { GET as getClient } from "@/app/api/clients/by-key/[key]/route";
import { PUT as putNotes } from "@/app/api/clients/by-key/[key]/notes/route";
import { GET as getDashboard } from "@/app/api/dashboard/route";
import { createMemoryStore } from "@/lib/store/memory-store";
import type { Store } from "@/lib/store/store";
import type { Client, InvoiceSummary } from "@/types";
import { stubEnv } from "../support/env";
import { jsonResponse } from "../support/http";
import { ecbResponse } from "../support/rates";
import { BRIGHTWELL, OKAFOR, openInvoice, overdueInvoice, paidInvoice } from "../support/summaries";
import "../support/next-server";

const paypal = vi.hoisted(() => ({ loadInvoices: vi.fn() }));
vi.mock("@/lib/paypal/summaries", () => ({ loadInvoices: paypal.loadInvoices }));

let store: Store;
vi.mock("@/lib/store", () => ({ getStore: () => store }));

const origin = "http://localhost:3000";
const NORTHPINE: Client = { name: "Northpine Studio", email: "buyer@personal.example.com" };

// Rupees come from the amounts: 1,000 GBP outweighs 720 EUR, which outweighs 100 USD.
const worth = (invoice: InvoiceSummary, currency: "USD" | "EUR" | "GBP", value: string) => ({
  ...invoice,
  amount: { currency, value },
});

function serve(...summaries: InvoiceSummary[]): void {
  paypal.loadInvoices.mockResolvedValue(
    summaries.map((summary) => ({
      summary,
      amountDue: summary.amount,
      underLut: false,
      sac: null,
      paymentId: null,
      marker: "dueline-request:test",
    })),
  );
}

function seriesRows(): unknown[] {
  return ["2026-10-23", "2026-11-04"].flatMap((date) =>
    [
      ["INR", 102],
      ["USD", 1.2],
      ["GBP", 0.8],
      ["CAD", 1.6],
      ["AUD", 1.8],
    ].map(([quote, rate]) => ({ date, base: "EUR", quote, rate })),
  );
}

const keyContext = (key: string) => ({ params: Promise.resolve({ key }) }) as never;

function put(key: string, body: unknown): Promise<Response> {
  return putNotes(
    new Request(`${origin}/api/clients/by-key/${key}/notes`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    keyContext(key),
  );
}

beforeEach(() => {
  store = createMemoryStore();
  stubEnv({ DEMO_TODAY: "2026-11-05" });
  vi.resetAllMocks();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) =>
    new URL(String(input)).searchParams.has("from")
      ? jsonResponse(seriesRows())
      : ecbResponse("2026-11-04"),
  );
  serve(
    paidInvoice("2026-08-14", "2026-08-26", OKAFOR),
    overdueInvoice("2026-10-26", 10, OKAFOR),
    worth(overdueInvoice("2026-11-02", 3, BRIGHTWELL), "GBP", "1000.00"),
    worth(openInvoice("2026-11-12", NORTHPINE), "USD", "100.00"),
  );
});

afterEach(() => vi.restoreAllMocks());

describe("GET /api/dashboard", () => {
  it("answers every widget", async () => {
    const response = await getDashboard();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(Object.keys(body).sort()).toEqual([
      "feesLost",
      "forecast",
      "lateClients",
      "paySpeed",
      "rateAlerts",
      "rates",
      "upcomingDue",
    ]);
    expect(body.forecast.buckets).toHaveLength(3);
    expect(body.feesLost).toMatchObject({ financialYear: "2026-27" });
    expect(body.rates).toMatchObject({ onDate: "2026-11-04", hasAverage: true });
  });

  it("names the clients behind and the invoices falling due", async () => {
    const body = await (await getDashboard()).json();

    expect(body.lateClients.map(({ name }: { name: string }) => name)).toEqual([
      "Okafor & Reyes",
      "Brightwell Labs",
    ]);
    expect(body.upcomingDue.map(({ clientName }: { clientName: string }) => clientName)).toEqual([
      "Northpine Studio",
    ]);
  });

  it("answers with empty widgets when there are no invoices", async () => {
    serve();
    const body = await (await getDashboard()).json();

    expect(body.lateClients).toEqual([]);
    expect(body.upcomingDue).toEqual([]);
    expect(body.feesLost).toMatchObject({ lostInr: 0, receivedInr: 0, lostPer100: 0 });
  });
});

describe("GET /api/clients", () => {
  it("lists one row per client, the most outstanding first", async () => {
    const { clients } = await (await listClients()).json();

    expect(clients.map(({ key }: { key: string }) => key)).toEqual([
      "brightwell-labs",
      "okafor-reyes",
      "northpine-studio",
    ]);
    expect(clients[1]).toMatchObject({ name: "Okafor & Reyes", invoices: 2 });
    expect(clients[1].outstandingInr).toBeGreaterThan(clients[2].outstandingInr);
  });
});

describe("GET /api/clients/by-key/{key}", () => {
  it("returns the client, their invoices newest first, their risk and notes", async () => {
    await store.saveClientNotes("okafor-reyes", "Prefers invoices on Monday.");
    const response = await getClient(
      new Request(`${origin}/api/clients/by-key/okafor-reyes`),
      keyContext("okafor-reyes"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.client.key).toBe("okafor-reyes");
    expect(body.invoices).toHaveLength(2);
    expect(body.risk).toMatchObject({ clientName: "Okafor & Reyes", invoicesConsidered: 2 });
    expect(body.notes).toBe("Prefers invoices on Monday.");
  });

  it("answers 404 for a key no invoice maps to", async () => {
    const response = await getClient(
      new Request(`${origin}/api/clients/by-key/nobody`),
      keyContext("nobody"),
    );
    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe("not_found");
  });
});

describe("a client named like a fixed route", () => {
  const RISK: Client = { name: "Risk", email: "buyer@personal.example.com" };

  it("is reached under by-key, not by the radar's route", async () => {
    serve(paidInvoice("2026-08-14", "2026-08-26", RISK));
    const response = await getClient(
      new Request(`${origin}/api/clients/by-key/risk`),
      keyContext("risk"),
    );

    expect(response.status).toBe(200);
    expect((await response.json()).client).toMatchObject({ key: "risk", name: "Risk" });
  });

  it("keeps notes under by-key", async () => {
    serve(paidInvoice("2026-08-14", "2026-08-26", RISK));
    expect((await put("risk", { notes: "Pays late." })).status).toBe(200);
    expect(await store.getClientNotes("risk")).toBe("Pays late.");
  });
});

describe("PUT /api/clients/by-key/{key}/notes", () => {
  it("saves the notes and returns them", async () => {
    const response = await put("brightwell-labs", { notes: "  Net 14. Ask for the PO number.  " });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ notes: "Net 14. Ask for the PO number." });
    expect(await store.getClientNotes("brightwell-labs")).toBe("Net 14. Ask for the PO number.");
  });

  it("clears the notes when sent empty", async () => {
    await put("brightwell-labs", { notes: "something" });
    await put("brightwell-labs", { notes: "" });
    expect(await store.getClientNotes("brightwell-labs")).toBe("");
  });

  it("refuses notes over 1,000 characters", async () => {
    const response = await put("brightwell-labs", { notes: "a".repeat(1001) });
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("invalid_request");
  });

  it("answers 404 for an unknown client and stores nothing", async () => {
    const response = await put("nobody", { notes: "hello" });
    expect(response.status).toBe(404);
    expect(await store.getClientNotes("nobody")).toBe("");
  });
});
