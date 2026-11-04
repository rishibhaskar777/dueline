import "server-only";
import { afterResponse } from "@/lib/after-response";
import { applyAliases } from "@/lib/clients/aliases";
import { today } from "@/lib/clock";
import { inBatches } from "@/lib/in-batches";
import { getStore } from "@/lib/store";
import type { ActualPayout, InvoiceSummary, Money } from "@/types";
import {
  changeMarkOf,
  dropSnapshot,
  dropStoredInvoice,
  FULL_INVOICE_TTL_MS,
  readSnapshot,
  readStoredInvoice,
  saveSnapshot,
  saveStoredInvoice,
  type InvoiceSnapshot,
  type SnapshotEntry,
  type StoredInvoice,
} from "./invoice-cache";
import { getInvoice, listInvoices } from "./invoices";
import { markerOf, sacOf, splitOf, type SplitTag } from "./memo";
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
  // Set on a deposit or balance invoice: which half it is and the id it shares with the other.
  split?: SplitTag;
}

// A draft stays out of every list, except a balance invoice waiting to be sent on delivery.
const HIDDEN_STATUSES = ["CANCELLED"];
const READS_AT_A_TIME = 4;
const STORE_READS_AT_A_TIME = 10;
const RETRY_AFTER_MS = 5 * 60 * 1000;
// A snapshot older than this is still served at once, and a refresh starts behind the response.
const REFRESH_AFTER_MS = 60 * 1000;
const RETRY_REFRESH_AFTER_MS = 30 * 1000;
// How long this instance trusts its own copy before it looks at the stored one, which another
// instance may have replaced after a write.
const LOCAL_TRUST_MS = 5 * 1000;

// PayPal can take hours to report fees, and the receivables page polls every 10 seconds.
const lastLookup = new Map<string, number>();

// PayPal's list leaves out items and the payer link, so every listed invoice is read in full. The
// read is kept here and in the store, and is read again only when the list shows a change.
const fullInvoices = new Map<string, StoredInvoice>();
// Invoices a write or an event just changed: read again whatever the list says.
const changed = new Set<string>();

let local: { snapshot: InvoiceSnapshot; checkedAt: number } | undefined;
let rebuilding: Promise<InvoiceSnapshot> | undefined;
let refreshQueued = false;
let lastRefreshFailedAt = 0;
let generation = 0;

// Forgets everything held here and in the store, so the next read builds from PayPal.
export async function clearInvoiceCaches(): Promise<void> {
  const ids = [...fullInvoices.keys()];
  lastLookup.clear();
  fullInvoices.clear();
  changed.clear();
  local = undefined;
  rebuilding = undefined;
  lastRefreshFailedAt = 0;
  generation += 1;
  await Promise.all([dropSnapshot(), ...ids.map(dropStoredInvoice)]);
}

function isCurrent(
  stored: StoredInvoice | null | undefined,
  mark: string,
): stored is StoredInvoice {
  return !!stored && stored.mark === mark && Date.now() - stored.readAt < FULL_INVOICE_TTL_MS;
}

async function recallFullInvoice(listed: PayPalInvoice): Promise<PayPalInvoice | undefined> {
  if (changed.has(listed.id)) return undefined;
  const mark = changeMarkOf(listed);
  const remembered = fullInvoices.get(listed.id);
  if (isCurrent(remembered, mark)) return remembered.invoice;
  const stored = await readStoredInvoice(listed.id);
  if (!isCurrent(stored, mark)) return undefined;
  fullInvoices.set(listed.id, stored);
  return stored.invoice;
}

async function readFullInvoice(listed: PayPalInvoice): Promise<PayPalInvoice> {
  const invoice = await getInvoice(listed.id);
  const read = { invoice, mark: changeMarkOf(listed), readAt: Date.now() };
  fullInvoices.set(listed.id, read);
  changed.delete(listed.id);
  await saveStoredInvoice(listed.id, read);
  return invoice;
}

// Takes each invoice from the copies kept here or in the store while the list shows no change, and
// reads only the rest from PayPal.
async function readInFull(listed: PayPalInvoice[]): Promise<PayPalInvoice[]> {
  const recalled = await inBatches(listed, STORE_READS_AT_A_TIME, recallFullInvoice);
  const missing = listed.filter((_, index) => !recalled[index]);
  const read = await inBatches(missing, READS_AT_A_TIME, readFullInvoice);
  const fetched = new Map(missing.map((invoice, index) => [invoice.id, read[index]]));
  return listed.flatMap((invoice, index) => {
    const found = recalled[index] ?? fetched.get(invoice.id);
    return found ? [found] : [];
  });
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

// Invoices PayPal no longer lists (deleted by a demo reset) leave the copies kept here and in the
// store, so nothing can bring them back.
async function forgetUnlisted(listed: PayPalInvoice[]): Promise<void> {
  const ids = new Set(listed.map((invoice) => invoice.id));
  const gone = [...fullInvoices.keys()].filter((id) => !ids.has(id));
  gone.forEach((id) => fullInvoices.delete(id));
  [...changed].filter((id) => !ids.has(id)).forEach((id) => changed.delete(id));
  await Promise.all(gone.map(dropStoredInvoice));
}

function isBalanceDraft(invoice: PayPalInvoice): boolean {
  return splitOf(invoice.detail.memo)?.role === "balance";
}

async function buildSnapshot(): Promise<InvoiceSnapshot> {
  const all = await listInvoices();
  await forgetUnlisted(all);
  const read = await readInFull(all.filter((invoice) => !HIDDEN_STATUSES.includes(invoice.status)));
  const invoices = read.filter((invoice) => invoice.status !== "DRAFT" || isBalanceDraft(invoice));
  const payouts = await findPayouts(invoices);
  return {
    builtAt: Date.now(),
    entries: invoices.map((invoice) => ({ invoice, payout: payouts.get(invoice.id) ?? null })),
  };
}

// Worked out on every read, with the date of that read: a snapshot from yesterday shows today's due
// and late states without a call to PayPal.
function toLoadedInvoices(entries: SnapshotEntry[], date: string): LoadedInvoice[] {
  return entries
    .flatMap(({ invoice, payout }) => {
      const summary = toInvoiceSummary(invoice, date, payout);
      return summary
        ? [
            {
              summary,
              marker: markerOf(invoice.detail.memo),
              amountDue: amountDueOf(invoice, summary.amount),
              underLut: isUnderLut(invoice),
              sac: sacOf(invoice.detail.memo),
              paymentId: latestPayment(invoice)?.payment_id ?? null,
              split: splitOf(invoice.detail.memo) ?? undefined,
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
  return readInFull(await listInvoices());
}

export async function findInvoiceByMemo(memo: string): Promise<PayPalInvoice | undefined> {
  return (await listInvoicesInFull()).find(
    (invoice) => markerOf(invoice.detail.memo) === markerOf(memo),
  );
}

function startRebuild(): Promise<InvoiceSnapshot> {
  const startedIn = generation;
  const build: Promise<InvoiceSnapshot> = buildSnapshot()
    .then(async (snapshot) => {
      if (startedIn === generation) {
        local = { snapshot, checkedAt: Date.now() };
        await saveSnapshot(snapshot);
      }
      return snapshot;
    })
    .finally(() => {
      if (rebuilding === build) rebuilding = undefined;
    });
  rebuilding = build;
  return build;
}

async function knownSnapshot(): Promise<InvoiceSnapshot | undefined> {
  if (local && Date.now() - local.checkedAt < LOCAL_TRUST_MS) return local.snapshot;
  const stored = await readSnapshot();
  if (!stored) {
    local = undefined;
    return undefined;
  }
  const newest = local && local.snapshot.builtAt > stored.builtAt ? local.snapshot : stored;
  local = { snapshot: newest, checkedAt: Date.now() };
  return newest;
}

// One refresh at a time, started after the response is sent. One that fails leaves the snapshot as
// it was and is not tried again for a short while.
function refreshInBackground(): void {
  if (refreshQueued || rebuilding || Date.now() - lastRefreshFailedAt < RETRY_REFRESH_AFTER_MS) {
    return;
  }
  refreshQueued = true;
  afterResponse(async () => {
    try {
      await (rebuilding ?? startRebuild());
    } catch {
      lastRefreshFailedAt = Date.now();
      console.warn("Invoice refresh failed, keeping the last snapshot");
    } finally {
      refreshQueued = false;
    }
  });
}

// Answers from the snapshot at once, however old; only a missing one is built before answering.
async function currentSnapshot(): Promise<InvoiceSnapshot> {
  const known = await knownSnapshot();
  if (!known) return rebuilding ?? startRebuild();
  if (Date.now() - known.builtAt >= REFRESH_AFTER_MS) refreshInBackground();
  return known;
}

// Makes the snapshot exact after a write or an event. The named invoices are read again from
// PayPal. If the refresh fails the snapshot is dropped, so the next read builds from PayPal
// instead of showing what is known to be old.
export async function refreshSnapshotNow(changedIds: readonly string[] = []): Promise<void> {
  changedIds.forEach((id) => changed.add(id));
  lastLookup.clear();
  generation += 1;
  try {
    await startRebuild();
  } catch {
    console.warn("Invoice refresh failed, the next read builds from PayPal");
    await clearInvoiceCaches();
  }
}

// Builds the snapshot when there is none or it is old, so the first screen finds it ready.
export async function warmInvoiceSnapshot(): Promise<void> {
  try {
    const known = await knownSnapshot();
    if (!known || Date.now() - known.builtAt >= REFRESH_AFTER_MS) {
      await (rebuilding ?? startRebuild());
    }
  } catch {
    console.warn("Warming the invoice snapshot failed");
  }
}

// When the invoices a request just used were read from PayPal, as an ISO time; null before any.
export function invoicesLoadedAt(): string | null {
  return local ? new Date(local.snapshot.builtAt).toISOString() : null;
}

// Rupee figures are filled in later, so a settings change shows up without waiting for PayPal.
// Merged clients are applied after the snapshot, so a merge shows at once.
async function loadWithDrafts(): Promise<LoadedInvoice[]> {
  const [snapshot, aliases] = await Promise.all([
    currentSnapshot(),
    getStore().listClientAliases(),
  ]);
  return applyAliases(toLoadedInvoices(snapshot.entries, today()), aliases);
}

// Drafts never count in totals, risk, forecast or the register until they are sent.
export async function loadInvoices(): Promise<LoadedInvoice[]> {
  return (await loadWithDrafts()).filter(({ summary }) => summary.paypalStatus !== "DRAFT");
}

// Balance invoices saved as drafts, waiting to be sent on delivery.
export async function loadReadyInvoices(): Promise<LoadedInvoice[]> {
  return (await loadWithDrafts()).filter(({ summary }) => summary.paypalStatus === "DRAFT");
}

// The other half of a deposit and balance pair, found among the invoices and the waiting drafts.
export async function findSplitPartner(
  tag: SplitTag,
): Promise<{ id: string; number: string } | null> {
  const partner = (await loadWithDrafts()).find(
    ({ split }) => split?.id === tag.id && split.role !== tag.role,
  );
  return partner ? { id: partner.summary.id, number: partner.summary.number } : null;
}
