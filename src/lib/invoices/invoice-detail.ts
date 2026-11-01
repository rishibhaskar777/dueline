import "server-only";
import { today } from "@/lib/clock";
import { InvoiceNotFoundError } from "@/lib/invoices/errors";
import { PayPalApiError } from "@/lib/paypal/errors";
import { getInvoice } from "@/lib/paypal/invoices";
import { isUnderLut, toMoney } from "@/lib/paypal/map";
import { summarise } from "@/lib/paypal/summaries";
import type { PayPalInvoice } from "@/lib/paypal/types";
import { loadSummaries } from "@/lib/payouts/load-summaries";
import { clientKey } from "@/lib/risk/client-key";
import { getStore } from "@/lib/store";
import type { InvoiceDetailResponse, InvoiceItem, InvoiceSummary } from "@/types";
import { availableActions } from "./invoice-actions";
import { buildTimeline } from "./timeline";

const ACTIVITY_LOOKBACK = 200;
const SAC_DESCRIPTION = /^SAC (99\d{4})$/;

function itemsOf(invoice: PayPalInvoice): InvoiceItem[] {
  return (invoice.items ?? []).flatMap((item) => {
    const unitAmount = toMoney(item.unit_amount.currency_code, item.unit_amount.value);
    if (!unitAmount) return [];
    return [
      {
        name: item.name,
        quantity: Number(item.quantity),
        unitAmount,
        sac: SAC_DESCRIPTION.exec(item.description ?? "")?.[1] ?? null,
      },
    ];
  });
}

async function readInvoice(id: string): Promise<PayPalInvoice> {
  try {
    return await getInvoice(id);
  } catch (error) {
    if (error instanceof PayPalApiError && error.status === 404) throw new InvoiceNotFoundError();
    throw error;
  }
}

// Listed invoices carry their rupees; a cancelled one is not listed, so it has none. An invoice
// hidden from the demo still has a page, so that it can be shown again.
async function summaryOf(invoice: PayPalInvoice): Promise<InvoiceSummary> {
  const listed = (await loadSummaries()).find(({ id }) => id === invoice.id);
  const hidden = listed ?? (await loadSummaries(true)).find(({ id }) => id === invoice.id);
  return hidden ?? summarise(invoice);
}

export async function getInvoiceDetail(id: string): Promise<InvoiceDetailResponse> {
  const invoice = await readInvoice(id);
  const store = getStore();
  const [summary, history, events, hiddenIds] = await Promise.all([
    summaryOf(invoice),
    store.reminderHistory(id),
    store.latestActivity(ACTIVITY_LOOKBACK),
    store.listHiddenInvoices(),
  ]);
  const reminders = history
    .map(({ tone, sentAt, channel }) => ({ tone, sentAt, channel }))
    .sort((a, b) => a.sentAt.localeCompare(b.sentAt));
  const activity = events.filter(({ invoiceId }) => invoiceId === id);

  return {
    invoice: summary,
    timeline: buildTimeline({ invoice, summary, reminders, activity, today: today() }),
    reminders,
    details: {
      clientKey: clientKey(summary.client.name),
      items: itemsOf(invoice),
      note: invoice.detail.note ?? "",
      underLut: isUnderLut(invoice),
      hiddenFromDemo: hiddenIds.includes(id),
      actions: availableActions(summary),
    },
  };
}
