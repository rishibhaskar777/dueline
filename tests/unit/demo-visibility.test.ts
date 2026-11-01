import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadActivityFeed } from "@/lib/demo/activity-feed";
import { loadVisibleInvoices } from "@/lib/demo/visible-invoices";
import { isShownInDemo, type VisibilityInput } from "@/lib/demo/visibility";
import type { LoadedInvoice } from "@/lib/paypal/summaries";
import { createMemoryStore } from "@/lib/store/memory-store";
import type { Store } from "@/lib/store/store";
import { activity } from "@/mocks/fixtures";
import { paidInvoice } from "../support/summaries";
import { stubEnv } from "../support/env";

const paypal = vi.hoisted(() => ({ loadInvoices: vi.fn() }));
vi.mock("@/lib/paypal/summaries", () => ({ loadInvoices: paypal.loadInvoices }));
let store: Store;
vi.mock("@/lib/store", () => ({ getStore: () => store }));

const GENERATION = 3;
const none: ReadonlySet<string> = new Set();

function invoice(marker: string, status = "SENT", id = "INV2-A"): VisibilityInput {
  return { id, marker, status };
}

describe("isShownInDemo", () => {
  it("shows the current generation of the story, open or recorded as paid outside PayPal", () => {
    expect(isShownInDemo(invoice("dueline-demo:3:tandem-pitch-deck"), GENERATION, none)).toBe(true);
    expect(
      isShownInDemo(
        invoice("dueline-demo:3:okafor-logo-refresh", "MARKED_AS_PAID"),
        GENERATION,
        none,
      ),
    ).toBe(true);
  });

  it("hides an older generation, and one from before generations, unless PayPal was paid", () => {
    expect(isShownInDemo(invoice("dueline-demo:2:tandem-pitch-deck"), GENERATION, none)).toBe(
      false,
    );
    expect(isShownInDemo(invoice("dueline-demo:old-key", "MARKED_AS_PAID"), GENERATION, none)).toBe(
      false,
    );
    expect(
      isShownInDemo(invoice("dueline-demo:2:tandem-pitch-deck", "PAID"), GENERATION, none),
    ).toBe(true);
    expect(isShownInDemo(invoice("dueline-demo:old-key", "PAID"), GENERATION, none)).toBe(true);
  });

  it("shows what was made through Dueline's own create flow", () => {
    expect(isShownInDemo(invoice("dueline-request:abc"), GENERATION, none)).toBe(true);
    expect(isShownInDemo(invoice("dueline-request:abc", "UNPAID"), 0, none)).toBe(true);
  });

  it("shows an invoice paid through PayPal that carries any Dueline marker", () => {
    expect(isShownInDemo(invoice("dueline-offline:halden", "PAID"), GENERATION, none)).toBe(true);
  });

  it("hides an invoice with no Dueline marker, even a paid one", () => {
    expect(isShownInDemo(invoice(""), GENERATION, none)).toBe(false);
    expect(isShownInDemo(invoice("", "PAID"), GENERATION, none)).toBe(false);
    expect(isShownInDemo(invoice("Sandbox", "SENT"), GENERATION, none)).toBe(false);
  });

  it("hides cancelled invoices and the ones the owner hid, whatever their marker", () => {
    expect(isShownInDemo(invoice("dueline-request:abc", "CANCELLED"), GENERATION, none)).toBe(
      false,
    );
    const hidden = new Set(["INV2-A"]);
    expect(isShownInDemo(invoice("dueline-request:abc", "PAID"), GENERATION, hidden)).toBe(false);
    expect(isShownInDemo(invoice("dueline-demo:3:x"), GENERATION, hidden)).toBe(false);
  });
});

function loaded(id: string, marker: string, status = "UNPAID"): LoadedInvoice {
  const summary = { ...paidInvoice("2026-10-10", "2026-10-12"), id, paypalStatus: status };
  return {
    summary,
    marker,
    amountDue: summary.amount,
    underLut: false,
    sac: null,
    paymentId: null,
  };
}

beforeEach(() => {
  store = createMemoryStore();
  stubEnv({ DEMO_TODAY: "2026-11-01" });
});

describe("loadVisibleInvoices", () => {
  const all = [
    loaded("current", "dueline-demo:2:tandem-pitch-deck"),
    loaded("old", "dueline-demo:1:tandem-pitch-deck"),
    loaded("mine", "dueline-request:abc"),
    loaded("dashboard", ""),
    loaded("paid-old", "dueline-demo:1:halden", "PAID"),
  ];

  it("applies the rule in demo mode with the stored generation and hidden invoices", async () => {
    paypal.loadInvoices.mockResolvedValue(all);
    await store.saveDemoGeneration({ id: 2, seededOn: "2026-11-01" });
    await store.setInvoiceHidden("mine", true);

    const ids = (await loadVisibleInvoices()).map(({ summary }) => summary.id);

    expect(ids).toEqual(["current", "paid-old"]);
  });

  it("treats a demo with no generation yet as generation 0, so the earlier story stays", async () => {
    paypal.loadInvoices.mockResolvedValue([
      loaded("legacy", "dueline-demo:okafor-logo-refresh"),
      loaded("newer", "dueline-demo:1:tandem-pitch-deck"),
    ]);

    expect((await loadVisibleInvoices()).map(({ summary }) => summary.id)).toEqual(["legacy"]);
  });

  it("hides nothing outside demo mode", async () => {
    stubEnv({ DEMO_MODE: "false" });
    paypal.loadInvoices.mockResolvedValue(all);
    await store.setInvoiceHidden("mine", true);

    expect(await loadVisibleInvoices()).toHaveLength(all.length);
  });
});

describe("loadActivityFeed", () => {
  const row = (id: string, invoiceId: string, kind: "sent" | "paid", at: string) => ({
    ...activity[0],
    id,
    invoiceId,
    kind,
    at,
  });

  it("drops events of invoices that are not shown and puts the story's events on its dates", async () => {
    const story = loaded("story", "dueline-demo:2:okafor-logo-refresh", "MARKED_AS_PAID");
    story.summary.issuedOn = "2026-08-17";
    story.summary.paidOn = "2026-09-02";
    paypal.loadInvoices.mockResolvedValue([
      story,
      loaded("mine", "dueline-request:abc", "UNPAID"),
      loaded("dashboard", ""),
    ]);
    await store.saveDemoGeneration({ id: 2, seededOn: "2026-11-01" });
    await store.addActivity(row("a", "story", "sent", "2026-10-31T18:00:00Z"));
    await store.addActivity(row("b", "story", "paid", "2026-10-31T18:01:00Z"));
    await store.addActivity(row("c", "mine", "sent", "2026-10-31T19:00:00Z"));
    await store.addActivity(row("d", "dashboard", "sent", "2026-10-31T20:00:00Z"));
    await store.addActivity(row("e", "cancelled-0003", "sent", "2026-10-31T21:00:00Z"));

    const feed = await loadActivityFeed(20);

    expect(feed.map(({ id, at }) => [id, at])).toEqual([
      ["c", "2026-10-31T19:00:00Z"],
      ["b", "2026-09-02T03:30:00.000Z"],
      ["a", "2026-08-17T03:30:00.000Z"],
    ]);
  });

  it("fills the 20 from visible events however many hidden ones come first", async () => {
    paypal.loadInvoices.mockResolvedValue([loaded("mine", "dueline-request:abc")]);
    for (let i = 0; i < 30; i++) {
      await store.addActivity(
        row(`hidden-${i}`, "dashboard", "sent", `2026-10-31T12:${String(i).padStart(2, "0")}:00Z`),
      );
    }
    for (let i = 0; i < 25; i++) {
      await store.addActivity(
        row(`mine-${i}`, "mine", "sent", `2026-10-30T12:${String(i).padStart(2, "0")}:00Z`),
      );
    }

    const feed = await loadActivityFeed(20);

    expect(feed).toHaveLength(20);
    expect(feed.every(({ invoiceId }) => invoiceId === "mine")).toBe(true);
  });

  it("returns the stored events outside demo mode", async () => {
    stubEnv({ DEMO_MODE: "false" });
    await store.addActivity(row("x", "anything", "sent", "2026-10-31T19:00:00Z"));

    expect((await loadActivityFeed(20)).map(({ id }) => id)).toEqual(["x"]);
  });
});
