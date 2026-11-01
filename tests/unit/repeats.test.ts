import { beforeEach, describe, expect, it, vi } from "vitest";
import { RepeatNotFoundError } from "@/lib/automation/errors";
import {
  createRepeat,
  deleteRepeat,
  listRepeats,
  prepareDueRepeats,
  setRepeatPaused,
} from "@/lib/automation/repeats";
import { InvalidActionError } from "@/lib/invoices/errors";
import { createMemoryStore } from "@/lib/store/memory-store";
import type { Store } from "@/lib/store/store";
import { stubEnv } from "../support/env";
import { BRIGHTWELL, OKAFOR, paidInvoice } from "../support/summaries";

const detail = vi.hoisted(() => ({ getInvoiceDetail: vi.fn() }));
vi.mock("@/lib/invoices/invoice-detail", () => ({ getInvoiceDetail: detail.getInvoiceDetail }));

let store: Store;
vi.mock("@/lib/store", () => ({ getStore: () => store }));

const first = "3f2b8c1e-6a4d-4e8b-9c1a-2d5e7f9a0b1c";
const second = "5d9e1f20-7b3c-4a86-8e4f-6a7b8c9d0e1f";

function serveInvoice(items = 2): void {
  detail.getInvoiceDetail.mockResolvedValue({
    invoice: {
      ...paidInvoice("2026-10-01", "2026-10-05", OKAFOR),
      amount: { currency: "EUR", value: "720.00" },
    },
    details: {
      clientKey: "okafor-reyes",
      underLut: true,
      note: "",
      actions: { remind: false, recordPayment: false, cancel: false },
      items: Array.from({ length: items }, (_, index) => ({
        name: `Item ${index + 1}`,
        quantity: index + 1,
        unitAmount: { currency: "EUR", value: "120.00" },
        sac: index === 0 ? "998391" : null,
      })),
    },
  });
}

beforeEach(() => {
  store = createMemoryStore();
  stubEnv({ DEMO_TODAY: "2026-11-05" });
  detail.getInvoiceDetail.mockReset();
  serveInvoice();
});

describe("createRepeat", () => {
  it("keeps the client, items, currency, purpose code and LUT of the invoice", async () => {
    const repeat = await createRepeat("INV2-1", 10, first);
    expect(repeat).toMatchObject({
      id: first,
      clientKey: "okafor-reyes",
      clientName: "Okafor & Reyes",
      currency: "EUR",
      purposeCode: "P1099",
      includeLutNote: true,
      dayOfMonth: 10,
      nextOn: "2026-11-10",
      paused: false,
    });
    expect(repeat.items).toEqual([
      { name: "Item 1", quantity: 1, unitAmount: "120.00", sac: "998391" },
      { name: "Item 2", quantity: 2, unitAmount: "120.00", sac: null },
    ]);
  });

  it("starts next month when the day has already passed", async () => {
    expect((await createRepeat("INV2-1", 1, first)).nextOn).toBe("2026-12-01");
  });

  it("saves a repeated request once", async () => {
    await createRepeat("INV2-1", 10, first);
    await createRepeat("INV2-1", 10, first);
    expect(await listRepeats()).toHaveLength(1);
    expect(detail.getInvoiceDetail).toHaveBeenCalledTimes(1);
  });

  it("refuses an invoice with no items", async () => {
    serveInvoice(0);
    await expect(createRepeat("INV2-1", 10, first)).rejects.toBeInstanceOf(InvalidActionError);
  });
});

describe("listRepeats", () => {
  it("can be limited to one client", async () => {
    await createRepeat("INV2-1", 10, first);
    detail.getInvoiceDetail.mockResolvedValue({
      ...(await detail.getInvoiceDetail("x")),
      invoice: paidInvoice("2026-10-01", "2026-10-05", BRIGHTWELL),
    });
    await createRepeat("INV2-2", 12, second);

    expect(await listRepeats()).toHaveLength(2);
    expect((await listRepeats("okafor-reyes")).map(({ id }) => id)).toEqual([first]);
  });
});

describe("pausing and deleting", () => {
  it("pauses a repeat, and resumes it for its next date rather than a missed one", async () => {
    await createRepeat("INV2-1", 3, first);
    const paused = await setRepeatPaused(first, true);
    expect(paused.paused).toBe(true);
    expect(paused.nextOn).toBe("2026-12-03");

    stubEnv({ DEMO_TODAY: "2027-01-20" });
    const resumed = await setRepeatPaused(first, false);
    expect(resumed).toMatchObject({ paused: false, nextOn: "2027-02-03" });
  });

  it("deletes a repeat and refuses one that is gone", async () => {
    await createRepeat("INV2-1", 10, first);
    await deleteRepeat(first);
    expect(await listRepeats()).toEqual([]);
    await expect(deleteRepeat(first)).rejects.toBeInstanceOf(RepeatNotFoundError);
    await expect(setRepeatPaused(first, true)).rejects.toBeInstanceOf(RepeatNotFoundError);
  });
});

describe("prepareDueRepeats", () => {
  it("queues a draft for a schedule that is due and moves its date on", async () => {
    await createRepeat("INV2-1", 10, first);
    const count = await prepareDueRepeats("2026-11-10");

    expect(count).toBe(1);
    const [queued] = await store.listQueue();
    expect(queued).toMatchObject({
      id: `repeat.${first}.2026-11-10`,
      kind: "repeat",
      repeatId: first,
      title: "Retainer for Okafor & Reyes is ready to send",
    });
    expect((await listRepeats())[0].nextOn).toBe("2026-12-10");
  });

  it("does nothing for a schedule that is not due, or is paused", async () => {
    await createRepeat("INV2-1", 10, first);
    expect(await prepareDueRepeats("2026-11-09")).toBe(0);

    await setRepeatPaused(first, true);
    expect(await prepareDueRepeats("2026-12-10")).toBe(0);
    expect(await store.listQueue()).toEqual([]);
  });

  it("makes one draft however often it runs on the same day", async () => {
    await createRepeat("INV2-1", 10, first);
    await prepareDueRepeats("2026-11-10");
    await prepareDueRepeats("2026-11-10");
    expect(await store.listQueue()).toHaveLength(1);
  });

  it("finishes a run that stopped before the date moved on, without a second draft", async () => {
    await createRepeat("INV2-1", 10, first);
    const [repeat] = await listRepeats();
    await store.addQueueItem({
      id: `repeat.${first}.${repeat.nextOn}`,
      kind: "repeat",
      title: "Retainer for Okafor & Reyes is ready to send",
      detail: "",
      invoiceId: null,
      repeatId: first,
    });

    await prepareDueRepeats("2026-11-10");
    expect(await store.listQueue()).toHaveLength(1);
    expect((await listRepeats())[0].nextOn).toBe("2026-12-10");
  });

  it("makes one draft, not several, for a schedule that fell months behind", async () => {
    await createRepeat("INV2-1", 28, first);
    await prepareDueRepeats("2027-03-02");

    expect(await store.listQueue()).toHaveLength(1);
    expect((await listRepeats())[0].nextOn).toBe("2027-03-28");
  });

  it("carries a day-28 schedule through the end of February", async () => {
    stubEnv({ DEMO_TODAY: "2026-01-31" });
    const repeat = await createRepeat("INV2-1", 28, first);
    expect(repeat.nextOn).toBe("2026-02-28");

    await prepareDueRepeats("2026-02-28");
    expect((await listRepeats())[0].nextOn).toBe("2026-03-28");
  });
});
