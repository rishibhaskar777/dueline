import { addDays } from "@/lib/clock";
import { formatDate } from "@/lib/format-date";
import type { CreateInvoiceRequest, Profile } from "@/types";
import { memoOf } from "./memo";
import type { PayPalInvoiceInput } from "./types";

type InvoiceToCreate = CreateInvoiceRequest["draft"];

interface InvoiceBodyOptions {
  invoiceNumber: string;
  invoiceDate: string;
  requestId: string;
  profile: Profile;
  discount?: CreateInvoiceRequest["discount"];
}

interface EarlyPayment {
  percent: number;
  validUntil: string;
}

const MEMO_PREFIX = "dueline-request:";
export const LUT_DECLARATION =
  "SUPPLY MEANT FOR EXPORT UNDER LETTER OF UNDERTAKING WITHOUT PAYMENT OF INTEGRATED TAX";
// Written on invoices made before the declaration above, which still count as under LUT.
const EARLIER_LUT_NOTE = "Export of services under LUT, without payment of IGST";

export function requestMemo(
  requestId: string,
  purposeCode: string | null = null,
  sac: string | null = null,
): string {
  return memoOf(`${MEMO_PREFIX}${requestId}`, purposeCode, sac);
}

export function mentionsLut(note: string | undefined): boolean {
  return note?.includes(LUT_DECLARATION) === true || note?.includes(EARLIER_LUT_NOTE) === true;
}

function lutLines({ lutArn }: Profile): string[] {
  return [
    LUT_DECLARATION,
    ...(lutArn ? [`LUT ARN: ${lutArn}`] : []),
    "Place of supply: outside India",
  ];
}

function noteOf(
  draft: InvoiceToCreate,
  profile: Profile,
  early: EarlyPayment | undefined,
): string | undefined {
  const lines = [
    draft.note,
    ...(draft.includeLutNote ? lutLines(profile) : []),
    early
      ? `Includes a ${early.percent}% early-payment discount, valid if paid by ${formatDate(early.validUntil)}`
      : undefined,
  ].filter((line): line is string => Boolean(line));
  return lines.length > 0 ? lines.join("\n") : undefined;
}

// PayPal takes a given name and a surname, so the last word is the surname.
function nameOf(yourName: string): { given_name: string; surname?: string } | undefined {
  const words = yourName.split(/\s+/).filter(Boolean);
  if (words.length === 0) return undefined;
  if (words.length === 1) return { given_name: words[0] };
  return { given_name: words.slice(0, -1).join(" "), surname: words.at(-1) };
}

function invoicerOf(profile: Profile): PayPalInvoiceInput["invoicer"] {
  const name = nameOf(profile.yourName);
  const invoicer = {
    ...(profile.businessName ? { business_name: profile.businessName } : {}),
    ...(name ? { name } : {}),
    ...(profile.gstin ? { tax_id: profile.gstin } : {}),
    ...(profile.website ? { website: profile.website } : {}),
  };
  return Object.keys(invoicer).length > 0 ? invoicer : undefined;
}

function earlier(a: string, b: string): string {
  return a < b ? a : b;
}

export function toPayPalInvoice(
  draft: InvoiceToCreate,
  options: InvoiceBodyOptions,
): PayPalInvoiceInput {
  const { invoiceNumber, invoiceDate, requestId, profile, discount } = options;
  // The note must never promise a discount date after the due date, so both use the earlier one.
  const early = discount
    ? {
        percent: discount.percent,
        validUntil: earlier(addDays(invoiceDate, discount.withinDays), draft.dueOn),
      }
    : undefined;
  const dueDate = early?.validUntil ?? draft.dueOn;
  const note = noteOf(draft, profile, early);
  const invoicer = invoicerOf(profile);

  return {
    detail: {
      invoice_number: invoiceNumber,
      invoice_date: invoiceDate,
      currency_code: draft.currency,
      ...(note ? { note } : {}),
      memo: requestMemo(requestId, draft.purposeCode, draft.items[0]?.sac ?? null),
      payment_term: { term_type: "DUE_ON_DATE_SPECIFIED", due_date: dueDate },
    },
    ...(invoicer ? { invoicer } : {}),
    primary_recipients: [
      {
        billing_info: {
          email_address: draft.client.email,
          business_name: draft.client.name,
          ...(draft.client.country ? { address: { country_code: draft.client.country } } : {}),
        },
      },
    ],
    items: draft.items.map((item) => ({
      name: item.name,
      ...(item.sac ? { description: `SAC ${item.sac}` } : {}),
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
