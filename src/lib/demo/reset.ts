import "server-only";
import { today } from "@/lib/clock";
import { daysBetween } from "@/lib/date-math";
import { getEnv } from "@/lib/env";
import { cancelInvoice, deleteDraftInvoice } from "@/lib/paypal/invoices";
import { clearInvoiceCaches, listInvoicesInFull } from "@/lib/paypal/summaries";
import type { PayPalInvoice } from "@/lib/paypal/types";
import { getStore } from "@/lib/store";
import type { DemoResetResponse } from "@/types";
import { DemoResetLimitError, DemoUnavailableError } from "./errors";
import { seedNewGeneration } from "./seed";
import { isDemoMemo } from "./story";

const RESET_KEY = "demo-reset";
const RESET_WINDOW_SECONDS = 10 * 60;
const OPEN_STATUSES = ["SENT", "UNPAID"];
// Another judge may be in the middle of creating an invoice, so a new one is left alone.
const RECENT_INVOICE_MINUTES = 30;

function isRecentInvoice(invoice: PayPalInvoice, now: number = Date.now()): boolean {
  const created = Date.parse(invoice.detail.metadata?.create_time ?? "");
  // An invoice with no readable creation time is treated as new rather than risk cancelling it.
  return Number.isNaN(created) || now - created < RECENT_INVOICE_MINUTES * 60_000;
}

const isOpen = (invoice: PayPalInvoice): boolean => OPEN_STATUSES.includes(invoice.status);

// Story invoices that are still open belong to an older generation once a new one starts, and are
// cancelled. Paid ones stay in PayPal, where they cannot be removed; the visibility rule hides them.
async function cancelOpenStory(invoices: PayPalInvoice[]): Promise<number> {
  const open = invoices.filter((invoice) => isOpen(invoice) && isDemoMemo(invoice.detail.memo));
  for (const invoice of open) await cancelInvoice(invoice.id);
  return open.length;
}

// Paid, marked-as-paid and partly paid invoices are never in these lists, so they are never touched.
async function clearOtherInvoices(
  invoices: PayPalInvoice[],
): Promise<Pick<DemoResetResponse, "cancelled" | "deleted" | "kept">> {
  const clearable = invoices.filter(
    (invoice) =>
      invoice.status === "DRAFT" || (isOpen(invoice) && !isDemoMemo(invoice.detail.memo)),
  );
  const kept = clearable.filter((invoice) => isRecentInvoice(invoice));
  const toCancel = clearable.filter(
    (invoice) => invoice.status !== "DRAFT" && !kept.includes(invoice),
  );
  const drafts = clearable.filter(
    (invoice) => invoice.status === "DRAFT" && !kept.includes(invoice),
  );

  for (const invoice of toCancel) await cancelInvoice(invoice.id);
  for (const invoice of drafts) await deleteDraftInvoice(invoice.id);
  return { cancelled: toCancel.length, deleted: drafts.length, kept: kept.length };
}

// One reset every ten minutes for the whole app. The count makes the claim atomic; the stored time
// only tells a refused caller how long is left.
async function claimReset(): Promise<void> {
  const store = getStore();
  const used = await store.hitRateLimit(RESET_KEY, RESET_WINDOW_SECONDS);
  if (used > 1) {
    const startedAt = await store.getCached(RESET_KEY);
    const elapsed = typeof startedAt === "number" ? Date.now() - startedAt : 0;
    const minutes = Math.max(1, Math.ceil((RESET_WINDOW_SECONDS * 1000 - elapsed) / 60_000));
    throw new DemoResetLimitError(minutes);
  }
  await store.putCached(RESET_KEY, Date.now(), RESET_WINDOW_SECONDS);
}

export async function resetDemo(): Promise<DemoResetResponse> {
  if (!getEnv().DEMO_MODE) throw new DemoUnavailableError();
  await claimReset();

  const invoices = await listInvoicesInFull();
  const olderStory = await cancelOpenStory(invoices);
  const others = await clearOtherInvoices(invoices);
  const { generation, rows } = await seedNewGeneration();
  clearInvoiceCaches();

  const created = rows.filter((row) => row.result === "created" || row.result === "repaired");
  const skipped = rows.filter((row) => row.result === "skipped");
  const failed = rows.length - created.length - skipped.length;
  const cancelled = others.cancelled + olderStory;
  console.info("Demo reset", {
    generation,
    cancelled,
    deleted: others.deleted,
    kept: others.kept,
    created: created.length,
    failed,
  });
  return {
    cancelled,
    deleted: others.deleted,
    created: created.length,
    skipped: skipped.length,
    failed,
    kept: others.kept,
  };
}

const RESEED_AFTER_DAYS = 7;

// The story is dated from the day it was seeded, so it ages. A week on it is seeded again as a new
// generation. This only cancels the open invoices of older generations and never touches any other
// invoice, and it waits its turn behind the reset limit.
export async function reseedStaleDemo(): Promise<void> {
  if (!getEnv().DEMO_MODE) return;
  const current = await getStore().getDemoGeneration();
  if (!current || daysBetween(current.seededOn, today()) < RESEED_AFTER_DAYS) return;

  try {
    await claimReset();
  } catch (error) {
    if (!(error instanceof DemoResetLimitError)) throw error;
    console.warn("Demo re-seed skipped", { reason: "reset_limit", generation: current.id });
    return;
  }
  const cancelled = await cancelOpenStory(await listInvoicesInFull());
  const { generation, rows } = await seedNewGeneration();
  clearInvoiceCaches();
  const failed = rows.filter((row) => row.result === "failed").length;
  console.info("Demo re-seeded", { generation, cancelled, created: rows.length - failed, failed });
}
