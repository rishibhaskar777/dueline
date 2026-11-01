import { fromMinorUnits, toMinorUnits } from "@/lib/money/decimal";
import { PayPalApiError } from "@/lib/paypal/errors";
import type { ActualPayout } from "@/types";
import type { PayPalInvoice, PayPalInvoiceInput } from "@/lib/paypal/types";

type Status = PayPalInvoice["status"];

const PAYER_LINK = "https://paypal.invalid/offline-invoice/";

function notFound(id: string): PayPalApiError {
  return new PayPalApiError({
    status: 404,
    paypalName: "RESOURCE_NOT_FOUND",
    message: `The invoice ${id} does not exist.`,
  });
}

// What the client owes: the items, less PayPal's invoice discount when the draft asks for one.
function amountOf(body: PayPalInvoiceInput): PayPalInvoice["amount"] {
  const subtotal = body.items.reduce(
    (sum, item) => sum + Number(item.quantity) * toMinorUnits(item.unit_amount.value),
    0,
  );
  const percent = Number(body.amount?.breakdown.discount.invoice_discount.percent ?? 0);
  return {
    currency_code: body.detail.currency_code,
    value: fromMinorUnits(Math.round((subtotal * (100 - percent)) / 100)),
  };
}

// A small stand-in for PayPal's Invoicing API that keeps invoices in memory, so seeding and
// resetting can be followed from one call to the next. Offline mode and the tests share it.
export function createFakePayPal() {
  const invoices = new Map<string, PayPalInvoice>();
  // PayPal's figures for payments made through PayPal, by payment (capture) id.
  const captures = new Map<string, ActualPayout>();
  const calls = {
    sent: [] as string[],
    reminded: [] as string[],
    cancelled: [] as string[],
    deleted: [] as string[],
    payments: [] as { id: string; paymentDate: string }[],
  };
  let counter = 0;

  function add(
    status: Status,
    memo?: string,
    overrides: Partial<PayPalInvoice> = {},
  ): PayPalInvoice {
    counter += 1;
    const invoice: PayPalInvoice = {
      id: `INV2-FAKE-${counter}`,
      status,
      detail: {
        invoice_number: `INV-${1000 + counter}`,
        invoice_date: "2026-10-01",
        currency_code: "USD",
        metadata: { create_time: "2026-10-01T00:00:00Z" },
        ...(memo ? { memo } : {}),
      },
      ...overrides,
    };
    invoices.set(invoice.id, invoice);
    return invoice;
  }

  function read(id: string): PayPalInvoice {
    const invoice = invoices.get(id);
    if (!invoice) throw notFound(id);
    return invoice;
  }

  function change(id: string, status: Status, metadata: object = {}): void {
    const invoice = read(id);
    invoices.set(id, {
      ...invoice,
      status,
      detail: {
        ...invoice.detail,
        metadata: {
          ...invoice.detail.metadata,
          last_update_time: new Date().toISOString(),
          ...metadata,
        },
      },
    });
  }

  return {
    invoices,
    captures,
    calls,
    add,
    statusOf: (id: string): Status | undefined => invoices.get(id)?.status,
    nextInvoiceNumber: async (): Promise<string> => `INV-${2000 + invoices.size}`,
    createDraftInvoice: async (body: PayPalInvoiceInput): Promise<PayPalInvoice> =>
      add("DRAFT", body.detail.memo, {
        detail: {
          ...body.detail,
          metadata: { create_time: new Date().toISOString() },
        },
        primary_recipients: body.primary_recipients,
        items: body.items,
        invoicer: body.invoicer,
        amount: amountOf(body),
      }),
    sendInvoice: async (id: string): Promise<void> => {
      calls.sent.push(id);
      change(id, "SENT", {
        first_sent_time: new Date().toISOString(),
        recipient_view_url: `${PAYER_LINK}${id}`,
      });
    },
    remindInvoice: async (id: string): Promise<void> => {
      read(id);
      calls.reminded.push(id);
    },
    recordExternalPayment: async (
      id: string,
      payment: { paymentDate: string; method?: string },
    ): Promise<void> => {
      calls.payments.push({ id, paymentDate: payment.paymentDate });
      change(id, "MARKED_AS_PAID");
      const paid = read(id);
      invoices.set(id, {
        ...paid,
        payments: {
          paid_amount: paid.amount,
          transactions: [
            {
              payment_id: `EXTERNAL-${id}`,
              payment_date: payment.paymentDate,
              method: payment.method ?? "BANK_TRANSFER",
              amount: paid.amount,
            },
          ],
        },
      });
    },
    cancelInvoice: async (id: string): Promise<void> => {
      calls.cancelled.push(id);
      change(id, "CANCELLED");
    },
    deleteDraftInvoice: async (id: string): Promise<void> => {
      read(id);
      calls.deleted.push(id);
      invoices.delete(id);
    },
    getInvoice: async (id: string): Promise<PayPalInvoice> => read(id),
    listInvoicesInFull: async (): Promise<PayPalInvoice[]> => [...invoices.values()],
  };
}

export type FakePayPal = ReturnType<typeof createFakePayPal>;
