import { addDays } from "@/lib/clock";
import { formatDate } from "@/lib/format-date";
import type { CreateInvoiceRequest } from "@/types";
import type { PayPalInvoiceInput } from "./types";

type InvoiceToCreate = CreateInvoiceRequest["draft"];

interface InvoiceBodyOptions {
  invoiceNumber: string;
  invoiceDate: string;
  requestId: string;
  discount?: CreateInvoiceRequest["discount"];
}

interface EarlyPayment {
  percent: number;
  validUntil: string;
}

const MEMO_PREFIX = "dueline-request:";
export const LUT_NOTE = "Export of services under LUT, without payment of IGST";

// The memo is visible only to the invoicer. It lets a created invoice be found again by request.
export function requestMemo(requestId: string): string {
  return `${MEMO_PREFIX}${requestId}`;
}

function noteOf(draft: InvoiceToCreate, early: EarlyPayment | undefined): string | undefined {
  const lines = [
    draft.note,
    draft.includeLutNote ? LUT_NOTE : undefined,
    early
      ? `Includes a ${early.percent}% early-payment discount, valid if paid by ${formatDate(early.validUntil)}`
      : undefined,
  ].filter((line): line is string => Boolean(line));
  return lines.length > 0 ? lines.join("\n") : undefined;
}

function earlier(a: string, b: string): string {
  return a < b ? a : b;
}

export function toPayPalInvoice(
  draft: InvoiceToCreate,
  options: InvoiceBodyOptions,
): PayPalInvoiceInput {
  const { invoiceNumber, invoiceDate, requestId, discount } = options;
  // The note must never promise a discount date after the due date, so both use the earlier one.
  const early = discount
    ? {
        percent: discount.percent,
        validUntil: earlier(addDays(invoiceDate, discount.withinDays), draft.dueOn),
      }
    : undefined;
  const dueDate = early?.validUntil ?? draft.dueOn;
  const note = noteOf(draft, early);

  return {
    detail: {
      invoice_number: invoiceNumber,
      ...(draft.purposeCode ? { reference: draft.purposeCode } : {}),
      invoice_date: invoiceDate,
      currency_code: draft.currency,
      ...(note ? { note } : {}),
      memo: requestMemo(requestId),
      payment_term: { term_type: "DUE_ON_DATE_SPECIFIED", due_date: dueDate },
    },
    primary_recipients: [
      { billing_info: { email_address: draft.client.email, business_name: draft.client.name } },
    ],
    items: draft.items.map((item) => ({
      name: item.name,
      quantity: String(item.quantity),
      unit_amount: { currency_code: draft.currency, value: item.unitAmount },
    })),
    ...(early
      ? {
          amount: {
            breakdown: { discount: { invoice_discount: { percent: String(early.percent) } } },
          },
        }
      : {}),
  };
}
