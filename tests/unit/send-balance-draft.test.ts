import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { addDays, daysBetween, todayInKolkata } from "@/lib/date-math";
import { sendExistingDraft } from "@/lib/invoices/create-invoice";
import { toPayPalInvoice } from "@/lib/paypal/invoice-body";
import { createDraftInvoice, getInvoice } from "@/lib/paypal/invoices";
import { createMemoryStore } from "@/lib/store/memory-store";
import type { Store } from "@/lib/store/store";
import { EMPTY_PROFILE } from "@/types";
import { stubEnv } from "../support/env";

const holder = vi.hoisted(() => ({ store: undefined as Store | undefined }));
vi.mock("@/lib/store", () => ({ getStore: () => holder.store }));

const BUYER = "buyer@personal.example.com";
const DAYS_TO_PAY = 14;

let drafts = 0;

// A balance invoice that was saved `daysAgo` days before the day the clock now shows in India.
async function savedBalance(daysAgo: number): Promise<string> {
  drafts += 1;
  const savedOn = addDays(todayInKolkata(), -daysAgo);
  const draft = await createDraftInvoice(
    toPayPalInvoice(
      {
        client: { name: "Kraftwerk Studio", email: BUYER },
        currency: "EUR",
        dueOn: addDays(savedOn, DAYS_TO_PAY),
        items: [
          { name: "Balance (50%) for: Brand kit", quantity: 1, unitAmount: "615.00", sac: null },
        ],
        purposeCode: "P1007",
        includeLutNote: false,
      },
      {
        invoiceNumber: `INV-70${drafts}`,
        invoiceDate: savedOn,
        requestId: `balance-${drafts}`,
        profile: EMPTY_PROFILE,
        split: { role: "balance", id: "pair-1" },
      },
    ),
    `balance-${drafts}`,
  );
  return draft.id;
}

async function sendAt(instant: string, daysAgo: number): Promise<{ date: string; due: string }> {
  vi.setSystemTime(new Date(instant));
  const id = await savedBalance(daysAgo);
  await sendExistingDraft(id, crypto.randomUUID());
  const { detail } = await getInvoice(id);
  expect(daysBetween(detail.invoice_date, detail.payment_term?.due_date ?? "")).toBe(DAYS_TO_PAY);
  return { date: detail.invoice_date, due: detail.payment_term?.due_date ?? "" };
}

beforeAll(() => {
  holder.store = createMemoryStore();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-04T05:00:00Z"));
  stubEnv({ DUELINE_OFFLINE: "true" });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterAll(() => {
  vi.useRealTimers();
});

describe("sending a balance saved days ago, through the offline PayPal", () => {
  it("shows the sending day as its invoice date and keeps the days to pay", async () => {
    vi.setSystemTime(new Date("2026-11-04T05:00:00Z"));
    const id = await savedBalance(10);
    const before = (await getInvoice(id)).detail;
    expect(before.invoice_date).toBe("2026-10-25");
    expect(before.payment_term?.due_date).toBe("2026-11-08");

    await sendExistingDraft(id, crypto.randomUUID());

    const after = await getInvoice(id);
    expect(after.status).toBe("SENT");
    expect(after.detail.invoice_date).toBe("2026-11-04");
    expect(after.detail.payment_term?.due_date).toBe("2026-11-18");
  });

  it("dates it across a month end", async () => {
    expect(await sendAt("2026-11-29T18:31:00Z", 10)).toEqual({
      date: "2026-11-30",
      due: "2026-12-14",
    });
    expect(await sendAt("2026-11-30T18:29:00Z", 10)).toEqual({
      date: "2026-11-30",
      due: "2026-12-14",
    });
    expect(await sendAt("2026-11-30T18:31:00Z", 10)).toEqual({
      date: "2026-12-01",
      due: "2026-12-15",
    });
  });

  it("dates it by India time on either side of midnight", async () => {
    // 23:59 in India on 4 November is 18:29 UTC; two minutes later it is 5 November there.
    expect(await sendAt("2026-11-04T18:29:00Z", 10)).toEqual({
      date: "2026-11-04",
      due: "2026-11-18",
    });
    expect(await sendAt("2026-11-04T18:31:00Z", 10)).toEqual({
      date: "2026-11-05",
      due: "2026-11-19",
    });
  });
});
