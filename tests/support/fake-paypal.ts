import type { PayPalInvoice, PayPalInvoiceInput } from "@/lib/paypal/types";

type Status = PayPalInvoice["status"];

// A small stand-in for PayPal's Invoicing API that keeps invoices in memory, so seeding and
// resetting can be followed from one call to the next.
export function createFakePayPal() {
  const invoices = new Map<string, PayPalInvoice>();
  const calls = {
    sent: [] as string[],
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

  function change(id: string, status: Status): void {
    const invoice = invoices.get(id);
    if (!invoice) throw new Error(`No invoice ${id}`);
    invoices.set(id, { ...invoice, status });
  }

  return {
    invoices,
    calls,
    add,
    statusOf: (id: string): Status | undefined => invoices.get(id)?.status,
    nextInvoiceNumber: async (): Promise<string> => `INV-${2000 + invoices.size}`,
    createDraftInvoice: async (body: PayPalInvoiceInput): Promise<PayPalInvoice> =>
      add("DRAFT", body.detail.memo, {
        detail: { ...body.detail },
        primary_recipients: body.primary_recipients,
        items: body.items,
      }),
    sendInvoice: async (id: string): Promise<void> => {
      calls.sent.push(id);
      change(id, "SENT");
    },
    recordExternalPayment: async (id: string, payment: { paymentDate: string }): Promise<void> => {
      calls.payments.push({ id, paymentDate: payment.paymentDate });
      change(id, "MARKED_AS_PAID");
    },
    cancelInvoice: async (id: string): Promise<void> => {
      calls.cancelled.push(id);
      change(id, "CANCELLED");
    },
    deleteDraftInvoice: async (id: string): Promise<void> => {
      calls.deleted.push(id);
      invoices.delete(id);
    },
    listInvoicesInFull: async (): Promise<PayPalInvoice[]> => [...invoices.values()],
  };
}

export type FakePayPal = ReturnType<typeof createFakePayPal>;
