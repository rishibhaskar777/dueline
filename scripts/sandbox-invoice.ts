import { addDays, today } from "@/lib/clock";
import { PayPalApiError } from "@/lib/paypal/errors";
import { createDraftInvoice, nextInvoiceNumber, sendInvoice } from "@/lib/paypal/invoices";
import type { PayPalInvoice, PayPalInvoiceInput } from "@/lib/paypal/types";

interface SandboxInvoiceSpec {
  clientName: string;
  email: string;
  currency: string;
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

function buildInvoice(
  spec: SandboxInvoiceSpec,
  invoiceNumber: string,
  dates: { invoiceDate: string; dueDate: string },
): PayPalInvoiceInput {
  return {
    detail: {
      invoice_number: invoiceNumber,
      reference: spec.reference,
      invoice_date: dates.invoiceDate,
      currency_code: spec.currency,
      payment_term: { term_type: "DUE_ON_DATE_SPECIFIED", due_date: dates.dueDate },
    },
    primary_recipients: [
      { billing_info: { email_address: spec.email, business_name: spec.clientName } },
    ],
    items: [
      {
        name: spec.itemName,
        quantity: "1",
        unit_amount: { currency_code: spec.currency, value: spec.amount },
      },
    ],
  };
}

async function createDraft(
  spec: SandboxInvoiceSpec,
  invoiceNumber: string,
  dates: { invoiceDate: string; dueDate: string },
): Promise<PayPalInvoice> {
  return createDraftInvoice(buildInvoice(spec, invoiceNumber, dates), crypto.randomUUID());
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
