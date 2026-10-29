import "server-only";
import { today } from "@/lib/clock";
import { getStore } from "@/lib/store";
import type { ActualPayout, InvoiceSummary, Money } from "@/types";
import { getInvoice, listInvoices } from "./invoices";
import { amountDueOf, PAYOUT_STATUSES, toInvoiceSummary } from "./map";
import { getActualPayout } from "./payments";
import type { PayPalInvoice } from "./types";

interface LoadedInvoice {
  summary: InvoiceSummary;
  amountDue: Money;
}

const HIDDEN_STATUSES = ["DRAFT", "CANCELLED"];
const READS_AT_A_TIME = 4;
const RETRY_AFTER_MS = 5 * 60 * 1000;
const FULL_INVOICE_TTL_MS = 10 * 60 * 1000;
const RESULT_TTL_MS = 20 * 1000;

// PayPal can take hours to report fees, and the receivables page polls every 10 seconds.
const lastLookup = new Map<string, number>();

// PayPal's list leaves out items and the payer link, so every listed invoice is read in full.
const fullInvoices = new Map<string, { invoice: PayPalInvoice; readAt: number }>();

let finished: { loadedAt: number; invoices: LoadedInvoice[] } | undefined;
let inFlight: Promise<LoadedInvoice[]> | undefined;
let generation = 0;

export function clearInvoiceCaches(): void {
  lastLookup.clear();
  fullInvoices.clear();
  finished = undefined;
  inFlight = undefined;
  generation += 1;
}

async function inBatches<T, R>(items: T[], work: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  for (let start = 0; start < items.length; start += READS_AT_A_TIME) {
    results.push(...(await Promise.all(items.slice(start, start + READS_AT_A_TIME).map(work))));
  }
  return results;
}

async function readInFull(listed: PayPalInvoice): Promise<PayPalInvoice> {
  const cached = fullInvoices.get(listed.id);
  if (
    cached &&
    cached.invoice.status === listed.status &&
    Date.now() - cached.readAt < FULL_INVOICE_TTL_MS
  ) {
    return cached.invoice;
  }
  const invoice = await getInvoice(listed.id);
  fullInvoices.set(listed.id, { invoice, readAt: Date.now() });
  return invoice;
}

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

async function findPayouts(invoices: PayPalInvoice[]): Promise<Map<string, ActualPayout | null>> {
  const paid = invoices.filter((invoice) => PAYOUT_STATUSES.includes(invoice.status));
  const found = await inBatches(paid, findPayout);
  return new Map(paid.map((invoice, index) => [invoice.id, found[index]]));
}

async function loadFresh(): Promise<LoadedInvoice[]> {
  const listed = (await listInvoices()).filter(
    (invoice) => !HIDDEN_STATUSES.includes(invoice.status),
  );
  const invoices = await inBatches(listed, readInFull);
  const payouts = await findPayouts(invoices);
  const date = today();

  return invoices
    .flatMap((invoice) => {
      const summary = toInvoiceSummary(invoice, date, payouts.get(invoice.id) ?? null);
      return summary ? [{ summary, amountDue: amountDueOf(invoice, summary.amount) }] : [];
    })
    .sort((a, b) => b.summary.issuedOn.localeCompare(a.summary.issuedOn));
}

// Rupee figures are filled in later, so a settings change shows up without waiting for PayPal.
export function loadInvoices(): Promise<LoadedInvoice[]> {
  if (finished && Date.now() - finished.loadedAt < RESULT_TTL_MS) {
    return Promise.resolve(finished.invoices);
  }
  if (!inFlight) {
    const startedIn = generation;
    const load = loadFresh()
      .then((invoices) => {
        if (startedIn === generation) finished = { loadedAt: Date.now(), invoices };
        return invoices;
      })
      .finally(() => {
        if (startedIn === generation) inFlight = undefined;
      });
    inFlight = load;
  }
  return inFlight;
}
