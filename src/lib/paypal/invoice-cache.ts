import "server-only";
import { z } from "zod";
import { getStore } from "@/lib/store";
import type { Json } from "@/lib/store/store";
import type { ActualPayout } from "@/types";
import type { PayPalInvoice } from "./types";

// Change the version when the shape of a stored value changes, so an old value is never read.
const SNAPSHOT_KEY = "invoices:snapshot:v2";
const FULL_INVOICE_KEY = "invoices:full:v1:";
const SNAPSHOT_TTL_SECONDS = 7 * 24 * 60 * 60;
// An invoice that PayPal's list shows unchanged is trusted for this long before it is read again.
export const FULL_INVOICE_TTL_MS = 6 * 60 * 60 * 1000;

// What PayPal said about one invoice when the snapshot was built: the invoice itself and the payout
// figures found for it. Due states and days late are worked out from these on every read, so a
// snapshot keeps its meaning from one India day to the next.
export interface SnapshotEntry {
  invoice: PayPalInvoice;
  payout: ActualPayout | null;
}

export interface InvoiceSnapshot {
  builtAt: number;
  entries: SnapshotEntry[];
}

export interface StoredInvoice {
  invoice: PayPalInvoice;
  mark: string;
  readAt: number;
}

const snapshotSchema = z.object({
  builtAt: z.number(),
  entries: z.array(
    z.object({
      invoice: z.custom<PayPalInvoice>((value) => typeof value === "object" && value !== null),
      payout: z.custom<ActualPayout | null>(
        (value) => value === null || (typeof value === "object" && value !== null),
      ),
    }),
  ),
});

const storedInvoiceSchema = z.object({
  invoice: z.custom<PayPalInvoice>((value) => typeof value === "object" && value !== null),
  mark: z.string(),
  readAt: z.number(),
});

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

// PayPal's list carries no update time, so a change is spotted by the fields that feed a loaded
// invoice: its status, amounts, dates, memo and recipient.
export function changeMarkOf(listed: PayPalInvoice): string {
  const { detail } = listed;
  return [
    listed.status,
    listed.amount?.value,
    listed.due_amount?.value,
    listed.payments?.paid_amount?.value,
    detail.invoice_number,
    detail.invoice_date,
    detail.payment_term?.due_date,
    detail.memo,
    detail.note,
    listed.primary_recipients?.[0]?.billing_info.email_address,
  ].join("|");
}

// The stored copies only speed things up, so a store that fails reads as an empty one.
async function readStored(key: string): Promise<Json | null> {
  try {
    return await getStore().getCached(key);
  } catch {
    console.warn("Invoice cache unavailable");
    return null;
  }
}

async function writeStored(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  try {
    await getStore().putCached(key, toJson(value), ttlSeconds);
  } catch {
    console.warn("Invoice cache not saved");
  }
}

export async function readSnapshot(): Promise<InvoiceSnapshot | null> {
  const parsed = snapshotSchema.safeParse(await readStored(SNAPSHOT_KEY));
  return parsed.success ? parsed.data : null;
}

export function saveSnapshot(snapshot: InvoiceSnapshot): Promise<void> {
  return writeStored(SNAPSHOT_KEY, snapshot, SNAPSHOT_TTL_SECONDS);
}

// There is no delete on the store; a null that expires at once reads as no snapshot.
export function dropSnapshot(): Promise<void> {
  return writeStored(SNAPSHOT_KEY, null, 1);
}

export async function readStoredInvoice(id: string): Promise<StoredInvoice | null> {
  const parsed = storedInvoiceSchema.safeParse(await readStored(`${FULL_INVOICE_KEY}${id}`));
  return parsed.success ? parsed.data : null;
}

export function dropStoredInvoice(id: string): Promise<void> {
  return writeStored(`${FULL_INVOICE_KEY}${id}`, null, 1);
}

export function saveStoredInvoice(id: string, stored: StoredInvoice): Promise<void> {
  return writeStored(`${FULL_INVOICE_KEY}${id}`, stored, FULL_INVOICE_TTL_MS / 1000);
}
