import "server-only";
import { z } from "zod";
import { today } from "@/lib/clock";
import { getStore } from "@/lib/store";
import type { ActivityKind } from "@/types";
import { getInvoice } from "./invoices";
import { toInvoiceSummary } from "./map";
import { getActualPayout } from "./payments";
import { clearInvoiceCaches } from "./summaries";

const webhookEventSchema = z.object({
  id: z.string().min(1),
  event_type: z.string().min(1),
  create_time: z.string().optional(),
  resource: z.object({ id: z.string().min(1) }).optional(),
});

type WebhookEvent = z.infer<typeof webhookEventSchema>;

export function parseWebhookEvent(rawBody: string): WebhookEvent | null {
  try {
    const parsed = webhookEventSchema.safeParse(JSON.parse(rawBody));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

const INVOICE_EVENT_PREFIX = "INVOICING.INVOICE.";
const ACTIVITY_KINDS: Record<string, ActivityKind> = {
  "INVOICING.INVOICE.PAID": "paid",
  "INVOICING.INVOICE.SENT": "sent",
};

function happenedAt(event: WebhookEvent): string {
  const reported = event.create_time ? new Date(event.create_time) : undefined;
  return (reported && !Number.isNaN(reported.getTime()) ? reported : new Date()).toISOString();
}

// The event only says that something changed; PayPal's current invoice is what Dueline believes.
async function refreshInvoice(event: WebhookEvent, invoiceId: string): Promise<void> {
  const store = getStore();
  const invoice = await getInvoice(invoiceId);
  clearInvoiceCaches();

  const kind = ACTIVITY_KINDS[event.event_type];
  const payout = kind === "paid" ? await getActualPayout(invoice) : null;
  if (payout) await store.putActualPayout(invoice.id, payout);
  if (!kind) return;

  const summary = toInvoiceSummary(invoice, today(), payout);
  if (!summary) return;
  await store.addActivity({
    id: event.id,
    kind,
    invoiceId: summary.id,
    invoiceNumber: summary.number,
    clientName: summary.client.name,
    at: happenedAt(event),
    amount: summary.amount,
  });
}

export async function processWebhookEvent(event: WebhookEvent): Promise<void> {
  const store = getStore();
  if (await store.isProcessed(event.id)) return;

  if (event.event_type.startsWith(INVOICE_EVENT_PREFIX) && event.resource) {
    await refreshInvoice(event, event.resource.id);
  }
  await store.markProcessed(event.id);
}
