import "server-only";
import { today } from "@/lib/clock";
import { getStore } from "@/lib/store";
import type { ActualPayout, InvoiceSummary } from "@/types";
import { getInvoice, listInvoices } from "./invoices";
import { PAYOUT_STATUSES, toInvoiceSummary } from "./map";
import { getActualPayout } from "./payments";
import type { PayPalInvoice } from "./types";

const HIDDEN_STATUSES = ["DRAFT", "CANCELLED"];
const LOOKUPS_AT_A_TIME = 4;
const RETRY_AFTER_MS = 5 * 60 * 1000;

// PayPal can take hours to report fees, and the receivables page polls every 10 seconds.
const lastLookup = new Map<string, number>();

async function findPayout(invoice: PayPalInvoice): Promise<ActualPayout | null> {
  const store = getStore();
  const stored = await store.getActualPayout(invoice.id);
  if (stored) return stored;

  const previous = lastLookup.get(invoice.id);
  if (previous !== undefined && Date.now() - previous < RETRY_AFTER_MS) return null;
  lastLookup.set(invoice.id, Date.now());

  const fetched = await getActualPayout(invoice);
  if (fetched) await store.putActualPayout(invoice.id, fetched);
  return fetched;
}

async function inBatches<T, R>(items: T[], work: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  for (let start = 0; start < items.length; start += LOOKUPS_AT_A_TIME) {
    results.push(...(await Promise.all(items.slice(start, start + LOOKUPS_AT_A_TIME).map(work))));
  }
  return results;
}

// The invoice list may leave out payment details, so read the invoice itself when they are missing.
async function withPayments(invoice: PayPalInvoice): Promise<PayPalInvoice> {
  const needsPayments = PAYOUT_STATUSES.includes(invoice.status);
  return needsPayments && !invoice.payments?.transactions?.length
    ? getInvoice(invoice.id)
    : invoice;
}

async function findPayouts(invoices: PayPalInvoice[]): Promise<Map<string, ActualPayout | null>> {
  const paid = invoices.filter((invoice) => PAYOUT_STATUSES.includes(invoice.status));
  const found = await inBatches(paid, findPayout);
  return new Map(paid.map((invoice, index) => [invoice.id, found[index]]));
}

export async function loadInvoiceSummaries(): Promise<InvoiceSummary[]> {
  const listed = (await listInvoices()).filter(
    (invoice) => !HIDDEN_STATUSES.includes(invoice.status),
  );
  const invoices = await inBatches(listed, withPayments);
  const payouts = await findPayouts(invoices);
  const date = today();

  return invoices
    .map((invoice) => toInvoiceSummary(invoice, date, payouts.get(invoice.id) ?? null))
    .filter((summary): summary is InvoiceSummary => summary !== null)
    .sort((a, b) => b.issuedOn.localeCompare(a.issuedOn));
}
