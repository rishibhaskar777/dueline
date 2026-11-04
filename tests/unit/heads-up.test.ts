import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isHeadsUpDue } from "@/lib/reminders/heads-up";
import {
  draftReminderFor,
  listHeadsUpDrafts,
  listReminderDrafts,
} from "@/lib/reminders/reminder-drafts";
import { InvalidReminderError } from "@/lib/reminders/errors";
import { suggestTone } from "@/lib/reminders/tone";
import { createMemoryStore } from "@/lib/store/memory-store";
import type { Store } from "@/lib/store/store";
import { EMPTY_PROFILE, type Client, type InvoiceSummary, type Profile } from "@/types";
import { stubEnv } from "../support/env";
import { BRIGHTWELL, OKAFOR, openInvoice, overdueInvoice, paidInvoice } from "../support/summaries";

const loader = vi.hoisted(() => ({ loadInvoices: vi.fn() }));
vi.mock("@/lib/paypal/summaries", () => ({ loadInvoices: loader.loadInvoices }));

let store: Store;
vi.mock("@/lib/store", () => ({ getStore: () => store }));

const TODAY = "2026-11-04";
const NORTHPINE: Client = {
  name: "Northpine Studio",
  email: "buyer@personal.example.com",
  contactName: "Dan Keane",
};
const profile: Profile = {
  ...EMPTY_PROFILE,
  yourName: "Riya Sharma",
  sendHeadsUp: true,
  headsUpDays: 3,
};

function dueIn(days: number, client = NORTHPINE): InvoiceSummary {
  const [year, month, day] = TODAY.split("-").map(Number);
  const due = new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
  return { ...openInvoice(due, client), dueState: days <= 3 ? "due_soon" : "on_time" };
}

function load(summaries: InvoiceSummary[]): void {
  loader.loadInvoices.mockResolvedValue(
    summaries.map((summary) => ({
      summary,
      amountDue: summary.amount,
      underLut: false,
      paymentId: null,
      marker: "dueline-request:test",
    })),
  );
}

async function saveProfile(changes: Partial<Profile>): Promise<void> {
  await store.saveProfile({ ...profile, ...changes });
}

beforeEach(async () => {
  store = createMemoryStore();
  stubEnv({ DEMO_TODAY: TODAY });
  await saveProfile({});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => vi.restoreAllMocks());

describe("which invoices get a heads-up", () => {
  it.each([
    [0, true],
    [1, true],
    [3, true],
    [4, false],
    [10, false],
  ])("an unpaid invoice due in %s days with 3 days before: %s", (days, expected) => {
    expect(isHeadsUpDue(dueIn(days), [], profile, TODAY)).toBe(expected);
  });

  it("follows the days before from the profile, up to 7", () => {
    const week = dueIn(7);
    expect(isHeadsUpDue(week, [], { ...profile, headsUpDays: 7 }, TODAY)).toBe(true);
    expect(isHeadsUpDue(week, [], { ...profile, headsUpDays: 6 }, TODAY)).toBe(false);
  });

  it("leaves out an invoice that is late, paid or not yet sent", () => {
    expect(isHeadsUpDue(overdueInvoice("2026-11-03", 1), [], profile, TODAY)).toBe(false);
    expect(isHeadsUpDue(paidInvoice("2026-11-05", "2026-11-01"), [], profile, TODAY)).toBe(false);
    expect(isHeadsUpDue({ ...dueIn(2), paypalStatus: "DRAFT" }, [], profile, TODAY)).toBe(false);
  });

  it("leaves out an invoice that already had a heads-up, but not one that only had a reminder", () => {
    expect(isHeadsUpDue(dueIn(2), [{ tone: "heads_up" }], profile, TODAY)).toBe(false);
    expect(isHeadsUpDue(dueIn(2), [{ tone: "gentle" }], profile, TODAY)).toBe(true);
  });

  it("offers nothing when the setting is off", () => {
    expect(isHeadsUpDue(dueIn(2), [], { ...profile, sendHeadsUp: false }, TODAY)).toBe(false);
  });
});

describe("the heads-up window in India time", () => {
  const profileDays = { ...profile, headsUpDays: 3 };
  const listedAt = async (instant: string, dueOn: string): Promise<number> => {
    stubEnv();
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      vi.setSystemTime(new Date(instant));
      load([{ ...openInvoice(dueOn, NORTHPINE), dueState: "due_soon" }]);
      await saveProfile(profileDays);
      return (await listHeadsUpDrafts()).length;
    } finally {
      vi.useRealTimers();
    }
  };

  it("moves its edge at midnight in India, not in UTC", async () => {
    // 23:59 in India on 3 November is 18:29 UTC; two minutes later it is 4 November there.
    expect(await listedAt("2026-11-03T18:29:00Z", "2026-11-07")).toBe(0);
    expect(await listedAt("2026-11-03T18:31:00Z", "2026-11-07")).toBe(1);
  });

  it("counts days over a month end", async () => {
    expect(await listedAt("2026-11-28T06:00:00Z", "2026-12-02")).toBe(0);
    expect(await listedAt("2026-11-29T06:00:00Z", "2026-12-02")).toBe(1);
    expect(await listedAt("2026-11-30T18:31:00Z", "2026-12-02")).toBe(1);
  });
});

describe("the tone suggested", () => {
  it("is a heads-up before the invoice is late and never for a late one", () => {
    expect(suggestTone(0, [], null)).toBe("heads_up");
    for (const days of [1, 8, 31]) expect(suggestTone(days, [], "late_payer")).not.toBe("heads_up");
  });

  it("is firm for the first late reminder after a promised date went by", () => {
    expect(suggestTone(3, [], null, true)).toBe("firm");
    expect(suggestTone(3, [], null, false)).toBe("gentle");
  });
});

describe("heads-up drafts", () => {
  it("drafts the invoices due soon, soonest first, in the heads-up tone with the contact's first name", async () => {
    load([dueIn(3, BRIGHTWELL), dueIn(1), dueIn(9), overdueInvoice("2026-11-02", 2, OKAFOR)]);

    const drafts = await listHeadsUpDrafts();

    expect(drafts.map(({ tone }) => tone)).toEqual(["heads_up", "heads_up"]);
    expect(drafts[0].reason).toBe("Suggested heads-up: due tomorrow, and no heads-up sent yet.");
    expect(drafts[0].message).toMatch(/^Hi Dan,\n\n/);
    expect(drafts[0].message).toContain("A quick note that invoice");
    expect(drafts[0].source).toBe("template");
    expect(drafts[1].reason).toBe("Suggested heads-up: due in 3 days, and no heads-up sent yet.");
  });

  it("says thank you once, in the sign-off", async () => {
    load([dueIn(2)]);
    const [draft] = await listHeadsUpDrafts();
    expect(draft.message.match(/thank you/gi)).toHaveLength(1);
    expect(draft.message).toMatch(/Thank you,\nRiya Sharma$/);
  });

  it("never mentions lateness", async () => {
    load([dueIn(2)]);
    const [draft] = await listHeadsUpDrafts();
    expect(`${draft.subject} ${draft.message}`).not.toMatch(/overdue|late|deadline|past due/i);
  });

  it("lists nothing when the setting is off, and an invoice with a heads-up drops out", async () => {
    const invoice = dueIn(2);
    load([invoice]);
    await saveProfile({ sendHeadsUp: false });
    expect(await listHeadsUpDrafts()).toEqual([]);

    await saveProfile({});
    await store.logReminder({
      invoiceId: invoice.id,
      tone: "heads_up",
      sentAt: "2026-11-04T05:00:00Z",
      channel: "email",
    });
    expect(await listHeadsUpDrafts()).toEqual([]);
  });

  it("is kept out of the late list, and a heads-up already sent does not make the late reminder firm", async () => {
    const late = overdueInvoice("2026-11-01", 3);
    load([dueIn(2), late]);
    await store.logReminder({
      invoiceId: late.id,
      tone: "heads_up",
      sentAt: "2026-10-28T05:00:00Z",
      channel: "email",
    });

    const drafts = await listReminderDrafts();

    expect(drafts.map(({ invoiceId }) => invoiceId)).toEqual([late.id]);
    expect(drafts[0].tone).toBe("gentle");
    expect(drafts[0].reason).toBe("Suggested gentle: 3 days late.");
  });

  it("is refused for a late invoice, and a late tone is refused for an invoice not yet due", async () => {
    const late = overdueInvoice("2026-11-01", 3);
    const soon = dueIn(2);
    load([late, soon]);

    await expect(draftReminderFor(late.id, "heads_up", {})).rejects.toThrow(
      "This invoice is already late. Send a reminder instead.",
    );
    await expect(draftReminderFor(soon.id, "gentle", {})).rejects.toBeInstanceOf(
      InvalidReminderError,
    );
    await expect(draftReminderFor(soon.id, "heads_up", {})).resolves.toMatchObject({
      tone: "heads_up",
      pending: false,
    });
  });
});
