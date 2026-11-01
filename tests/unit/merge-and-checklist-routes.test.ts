import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as getChecklist } from "@/app/api/checklist/route";
import { POST as dismissChecklist } from "@/app/api/checklist/dismiss/route";
import { POST as postMerge } from "@/app/api/clients/by-key/[key]/merge/route";
import { DELETE as deleteMerged } from "@/app/api/clients/by-key/[key]/merged/[from]/route";
import { GET as getClient } from "@/app/api/clients/by-key/[key]/route";
import { GET as getExportRegister } from "@/app/api/export-register/route";
import type { LoadedInvoice } from "@/lib/paypal/summaries";
import { createMemoryStore } from "@/lib/store/memory-store";
import type { Store } from "@/lib/store/store";
import { EMPTY_PROFILE } from "@/types";
import { settings } from "@/mocks/fixtures";
import { stubEnv } from "../support/env";
import { OKAFOR, overdueInvoice, paidInvoice } from "../support/summaries";

const holder = vi.hoisted(() => ({ store: undefined as Store | undefined }));
const paypal = vi.hoisted(() => ({ loadInvoices: vi.fn() }));
vi.mock("@/lib/store", () => ({ getStore: () => holder.store }));
vi.mock("@/lib/paypal/summaries", () => ({ loadInvoices: paypal.loadInvoices }));
vi.mock("@/lib/payouts/load-summaries", () => ({
  loadSummaries: async () =>
    (await paypal.loadInvoices()).map(({ summary }: LoadedInvoice) => summary),
}));

const MAYA = { name: "Maya Studio", email: "maya@new.example" };

function loaded(summary: LoadedInvoice["summary"], marker = "dueline-request:test"): LoadedInvoice {
  return {
    summary,
    amountDue: summary.amount,
    underLut: false,
    sac: null,
    paymentId: null,
    marker,
  };
}

const keyContext = (key: string, from?: string) =>
  ({ params: Promise.resolve({ key, from }) }) as never;

function json(body: unknown, method = "POST"): Request {
  return new Request("http://localhost/api", {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  holder.store = createMemoryStore();
  stubEnv({ DEMO_TODAY: "2026-10-31", DEMO_MODE: "false" });
  paypal.loadInvoices.mockReset();
  paypal.loadInvoices.mockResolvedValue([
    loaded(paidInvoice("2026-08-01", "2026-08-13", OKAFOR)),
    loaded(overdueInvoice("2026-10-20", 11, MAYA)),
  ]);
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("no network in tests"));
});

afterEach(() => vi.restoreAllMocks());

describe("POST /api/clients/by-key/{key}/merge", () => {
  it("merges a client into another and answers with both keys", async () => {
    const response = await postMerge(json({ into: "okafor-reyes" }), keyContext("maya-studio"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ from: "maya-studio", into: "okafor-reyes" });
    expect((await holder.store?.listClientAliases())?.[0]).toMatchObject({
      fromKey: "maya-studio",
      fromEmail: "maya@new.example",
    });
  });

  it("is not found for a client no invoice maps to", async () => {
    const response = await postMerge(json({ into: "okafor-reyes" }), keyContext("nobody"));
    expect(response.status).toBe(404);
  });

  it("refuses a client that others were merged into, as an invalid state", async () => {
    await holder.store?.saveClientAlias({
      fromKey: "third-co",
      intoKey: "okafor-reyes",
      fromName: "Third Co",
      fromEmail: "t@third.example",
    });
    const response = await postMerge(json({ into: "maya-studio" }), keyContext("okafor-reyes"));

    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("invalid_state");
  });

  it("refuses a body without a target", async () => {
    const response = await postMerge(json({}), keyContext("maya-studio"));
    expect(response.status).toBe(400);
  });
});

describe("DELETE /api/clients/by-key/{key}/merged/{from}", () => {
  it("undoes a merge", async () => {
    await postMerge(json({ into: "okafor-reyes" }), keyContext("maya-studio"));

    const response = await deleteMerged(
      new Request("http://localhost/api", { method: "DELETE" }),
      keyContext("okafor-reyes", "maya-studio"),
    );

    expect(response.status).toBe(204);
    expect(await holder.store?.listClientAliases()).toEqual([]);
  });

  it("is not found when nothing was merged", async () => {
    const response = await deleteMerged(
      new Request("http://localhost/api", { method: "DELETE" }),
      keyContext("okafor-reyes", "maya-studio"),
    );
    expect(response.status).toBe(404);
  });
});

describe("GET /api/clients/by-key/{key}", () => {
  it("lists the clients merged into this one", async () => {
    await postMerge(json({ into: "okafor-reyes" }), keyContext("maya-studio"));
    const response = await getClient(
      new Request("http://localhost/api"),
      keyContext("okafor-reyes"),
    );
    expect((await response.json()).merged).toEqual([
      { key: "maya-studio", name: "Maya Studio", email: "maya@new.example" },
    ]);
  });
});

describe("the checklist routes", () => {
  it("ticks what the data shows and leaves the rest open", async () => {
    await holder.store?.saveSettings({ ...settings, prepareReminders: true });
    await holder.store?.saveProfile({
      ...EMPTY_PROFILE,
      yourName: "Riya",
      businessName: "Riya Designs",
    });

    const body = await (await getChecklist()).json();

    expect(body.dismissed).toBe(false);
    expect(body.items.map((item: { id: string; done: boolean }) => [item.id, item.done])).toEqual([
      ["profile", true],
      ["lut", false],
      ["first_invoice", true],
      ["morning_reminders", true],
      ["first_export", false],
    ]);
  });

  it("ticks the first invoice for any sent invoice, not only ones made through Dueline", async () => {
    paypal.loadInvoices.mockResolvedValue([
      loaded(paidInvoice("2026-08-01", "2026-08-13", OKAFOR), "paypal-dashboard"),
    ]);
    const first = (await (await getChecklist()).json()).items.find(
      (item: { id: string }) => item.id === "first_invoice",
    );
    expect(first.done).toBe(true);
  });

  it("leaves the first invoice open when only drafts or cancelled invoices exist", async () => {
    const draft = { ...overdueInvoice("2026-10-20", 11, OKAFOR), paypalStatus: "DRAFT" };
    const cancelled = { ...overdueInvoice("2026-10-21", 10, OKAFOR), paypalStatus: "CANCELLED" };
    paypal.loadInvoices.mockResolvedValue([loaded(draft), loaded(cancelled)]);
    const first = (await (await getChecklist()).json()).items.find(
      (item: { id: string }) => item.id === "first_invoice",
    );
    expect(first.done).toBe(false);
  });

  it("ticks the export once the register's CSV has been downloaded", async () => {
    await getExportRegister(new Request("http://localhost/api/export-register?month=2026-08"));
    expect(await holder.store?.hasFlag("export_downloaded")).toBe(false);

    const csv = await getExportRegister(
      new Request("http://localhost/api/export-register?month=2026-08&format=csv"),
    );
    expect(csv.status).toBe(200);

    const body = await (await getChecklist()).json();
    expect(body.items.find((item: { id: string }) => item.id === "first_export").done).toBe(true);
  });

  it("remembers a dismissal", async () => {
    const response = await dismissChecklist();
    expect(response.status).toBe(204);
    expect((await (await getChecklist()).json()).dismissed).toBe(true);
  });
});
