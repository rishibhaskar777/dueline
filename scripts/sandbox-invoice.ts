import { addDays, today } from "@/lib/clock";
import { PayPalApiError } from "@/lib/paypal/errors";
import { createDraftInvoice, nextInvoiceNumber, sendInvoice } from "@/lib/paypal/invoices";
import { toPayPalInvoice } from "@/lib/paypal/invoice-body";
import type { PayPalInvoice } from "@/lib/paypal/types";
import type { CurrencyCode } from "@/types";

interface SandboxInvoiceSpec {
  clientName: string;
  email: string;
  currency: CurrencyCode;
  amount: string;
  itemName: string;
  reference: string;
  invoiceDate: string;
  dueDate: string;
  fallbackTermDays: number;
}

interface SandboxInvoiceResult {
  invoice: PayPalInvoice;
  pastDatesAccepted: boolean;
}

async function createDraft(
  spec: SandboxInvoiceSpec,
  invoiceNumber: string,
  dates: { invoiceDate: string; dueDate: string },
): Promise<PayPalInvoice> {
  const requestId = crypto.randomUUID();
  const body = toPayPalInvoice(
    {
      client: { name: spec.clientName, email: spec.email },
      currency: spec.currency,
      dueOn: dates.dueDate,
      items: [{ name: spec.itemName, quantity: 1, unitAmount: spec.amount }],
      purposeCode: spec.reference || null,
      includeLutNote: false,
    },
    { invoiceNumber, invoiceDate: dates.invoiceDate, requestId },
  );
  return createDraftInvoice(body, requestId);
}

export async function createAndSendSandboxInvoice(
  spec: SandboxInvoiceSpec,
): Promise<SandboxInvoiceResult> {
  const invoiceNumber = await nextInvoiceNumber();
  let pastDatesAccepted = true;
  let draft: PayPalInvoice;
  try {
    draft = await createDraft(spec, invoiceNumber, {
      invoiceDate: spec.invoiceDate,
      dueDate: spec.dueDate,
    });
  } catch (error) {
    if (!(error instanceof PayPalApiError) || ![400, 422].includes(error.status)) throw error;
    console.log(`PayPal rejected the past dates: ${error.message}`);
    console.log("Retrying with today's date.");
    pastDatesAccepted = false;
    const invoiceDate = today();
    draft = await createDraft(spec, invoiceNumber, {
      invoiceDate,
      dueDate: addDays(invoiceDate, spec.fallbackTermDays),
    });
  }

  await sendInvoice(
    draft.id,
    { subject: `Invoice ${invoiceNumber}`, note: "Sandbox invoice. No real money moves." },
    crypto.randomUUID(),
  );
  return { invoice: draft, pastDatesAccepted };
}
