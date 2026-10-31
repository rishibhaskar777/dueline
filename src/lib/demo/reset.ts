import "server-only";
import { getEnv } from "@/lib/env";
import { cancelInvoice, deleteDraftInvoice } from "@/lib/paypal/invoices";
import { clearInvoiceCaches, listInvoicesInFull } from "@/lib/paypal/summaries";
import { getStore } from "@/lib/store";
import type { DemoResetResponse } from "@/types";
import { DemoResetLimitError, DemoUnavailableError } from "./errors";
import { seedDemo } from "./seed";
import { isDemoMemo } from "./story";

const RESET_KEY = "demo-reset";
const RESET_WINDOW_SECONDS = 10 * 60;
const OPEN_STATUSES = ["SENT", "UNPAID"];

// Paid, marked-as-paid and partly paid invoices are never in these lists, so they are never touched.
async function clearOpenInvoices(): Promise<Pick<DemoResetResponse, "cancelled" | "deleted">> {
  const invoices = await listInvoicesInFull();
  const toCancel = invoices.filter(
    (invoice) => OPEN_STATUSES.includes(invoice.status) && !isDemoMemo(invoice.detail.memo),
  );
  const drafts = invoices.filter((invoice) => invoice.status === "DRAFT");

  for (const invoice of toCancel) await cancelInvoice(invoice.id);
  for (const invoice of drafts) await deleteDraftInvoice(invoice.id);
  return { cancelled: toCancel.length, deleted: drafts.length };
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

  const { cancelled, deleted } = await clearOpenInvoices();
  const rows = await seedDemo();
  clearInvoiceCaches();

  const created = rows.filter((row) => row.result === "created" || row.result === "repaired");
  const skipped = rows.filter((row) => row.result === "skipped");
  const failed = rows.length - created.length - skipped.length;
  console.info("Demo reset", { cancelled, deleted, created: created.length, failed });
  return { cancelled, deleted, created: created.length, skipped: skipped.length, failed };
}
