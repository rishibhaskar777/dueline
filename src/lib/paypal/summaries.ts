import "server-only";
import { applyAliases } from "@/lib/clients/aliases";
import { today } from "@/lib/clock";
import { inBatches } from "@/lib/in-batches";
import { getStore } from "@/lib/store";
import type { ActualPayout, InvoiceSummary, Money } from "@/types";
import { getInvoice, listInvoices } from "./invoices";
import { markerOf, sacOf } from "./memo";
import { amountDueOf, isUnderLut, latestPayment, PAYOUT_STATUSES, toInvoiceSummary } from "./map";
import { getActualPayout } from "./payments";
import type { PayPalInvoice } from "./types";

export interface LoadedInvoice {
  summary: InvoiceSummary;
  // The first word of the invoice's private memo, which says where the invoice came from.
  marker: string;
  amountDue: Money;
  underLut: boolean;
  // SAC of the invoice's first item, from its private memo.
  sac: string | null;
  // The invoice's own latest payment, for a payout PayPal has not reported figures for.
  paymentId: string | null;
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

// Payouts stored before paid times were recorded have no paidAt key at all. They are read from
// PayPal once more; a payout PayPal gave no time for keeps `paidAt: null` and is not stale.
function hasPaidTime(payout: ActualPayout): boolean {
  return "paidAt" in payout;
}

async function findPayout(invoice: PayPalInvoice): Promise<ActualPayout | null> {
  const store = getStore();
  const stored = await store.getActualPayout(invoice.id);
  if (stored && hasPaidTime(stored)) return stored;

  const previous = lastLookup.get(invoice.id);
  if (previous !== undefined && Date.now() - previous < RETRY_AFTER_MS) return stored;
  lastLookup.set(invoice.id, Date.now());

  const fetched = await getActualPayout(invoice);
  if (fetched) await store.putActualPayout(invoice.id, fetched);
  return fetched ?? stored;
}

async function findPayouts(invoices: PayPalInvoice[]): Promise<Map<string, ActualPayout | null>> {
  const paid = invoices.filter((invoice) => PAYOUT_STATUSES.includes(invoice.status));
  const found = await inBatches(paid, READS_AT_A_TIME, findPayout);
  return new Map(paid.map((invoice, index) => [invoice.id, found[index]]));
}

async function loadFresh(): Promise<LoadedInvoice[]> {
  const listed = (await listInvoices()).filter(
    (invoice) => !HIDDEN_STATUSES.includes(invoice.status),
  );
  const invoices = await inBatches(listed, READS_AT_A_TIME, readInFull);
  const payouts = await findPayouts(invoices);
  const date = today();

  return invoices
    .flatMap((invoice) => {
      const summary = toInvoiceSummary(invoice, date, payouts.get(invoice.id) ?? null);
      return summary
        ? [
            {
              summary,
              marker: markerOf(invoice.detail.memo),
              amountDue: amountDueOf(invoice, summary.amount),
              underLut: isUnderLut(invoice),
              sac: sacOf(invoice.detail.memo),
              paymentId: latestPayment(invoice)?.payment_id ?? null,
            },
          ]
        : [];
    })
    .sort((a, b) => b.summary.issuedOn.localeCompare(a.summary.issuedOn));
}

export function recipientsOf(invoice: PayPalInvoice): string[] {
  return (invoice.primary_recipients ?? []).map(
    (recipient) => recipient.billing_info.email_address,
  );
}

export function summarise(invoice: PayPalInvoice): InvoiceSummary {
  const summary = toInvoiceSummary(invoice, today(), null);
  if (!summary) throw new Error("PayPal returned an invoice without a usable amount.");
  return summary;
}

// The list leaves out the memo, so every invoice is read in full, drafts and cancelled ones too.
// It skips the finished list on purpose: an invoice created a moment ago must be found.
export async function listInvoicesInFull(): Promise<PayPalInvoice[]> {
  return inBatches(await listInvoices(), READS_AT_A_TIME, readInFull);
}

export async function findInvoiceByMemo(memo: string): Promise<PayPalInvoice | undefined> {
  return (await listInvoicesInFull()).find(
    (invoice) => markerOf(invoice.detail.memo) === markerOf(memo),
  );
}

function loadCached(): Promise<LoadedInvoice[]> {
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

// Rupee figures are filled in later, so a settings change shows up without waiting for PayPal.
// Merged clients are applied after the cache, so a merge shows at once.
export async function loadInvoices(): Promise<LoadedInvoice[]> {
  const [loaded, aliases] = await Promise.all([loadCached(), getStore().listClientAliases()]);
  return applyAliases(loaded, aliases);
}
