import "server-only";
import { daysBetween } from "@/lib/date-math";
import { loadVisibleInvoices } from "@/lib/demo/visible-invoices";
import { getStore } from "@/lib/store";
import type { Store } from "@/lib/store/store";

const LOOK_BACK_DAYS = 14;
const FEED_WINDOW = 200;

// The invoices that already have a "paid" row, whoever wrote it: the webhook, the seed or this job.
// Whichever of the webhook and the job comes second sees the row and adds none.
export async function invoicesWithPaidRow(store: Store): Promise<Set<string>> {
  const feed = await store.latestActivity(FEED_WINDOW);
  return new Set(feed.filter(({ kind }) => kind === "paid").map(({ invoiceId }) => invoiceId));
}

// A payment through PayPal normally reaches Dueline as a webhook, which writes the "paid" row of the
// activity feed. If the webhook was missed, PayPal still has the invoice as paid and every screen
// already shows it, so only that row is missing; this adds it. The id is fixed per invoice, so a
// repeat adds nothing, and an invoice whose webhook did arrive already has its row.
export async function reconcilePaidInvoices(day: string): Promise<number> {
  const store = getStore();
  const [invoices, reported] = await Promise.all([
    loadVisibleInvoices(),
    invoicesWithPaidRow(store),
  ]);

  const missed = invoices
    .map(({ summary }) => summary)
    .filter(
      (summary) =>
        summary.paypalStatus === "PAID" &&
        summary.paidOn !== null &&
        daysBetween(summary.paidOn, day) <= LOOK_BACK_DAYS &&
        !reported.has(summary.id),
    );
  for (const summary of missed) {
    await store.addActivity({
      id: `reconciled:${summary.id}:paid`,
      kind: "paid",
      invoiceId: summary.id,
      invoiceNumber: summary.number,
      clientName: summary.client.name,
      at:
        summary.actualPayout?.paidAt ?? new Date(`${summary.paidOn}T12:00:00+05:30`).toISOString(),
      amount: summary.amount,
    });
  }
  return missed.length;
}
