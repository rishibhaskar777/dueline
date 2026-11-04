import { addDays } from "@/lib/clock";
import { formatDate } from "@/lib/format-date";
import { LUT_DECLARATION } from "@/lib/invoices/lut-wording";
import type { CreateInvoiceRequest, Profile } from "@/types";
import { memoOf, type SplitTag } from "./memo";
import type { PayPalInvoiceInput } from "./types";

type InvoiceToCreate = CreateInvoiceRequest["draft"];

interface InvoiceBodyOptions {
  invoiceNumber: string;
  invoiceDate: string;
  requestId: string;
  profile: Profile;
  discount?: CreateInvoiceRequest["discount"];
  split?: SplitTag;
}

interface EarlyPayment {
  percent: number;
  validUntil: string;
}

const MEMO_PREFIX = "dueline-request:";
// Written on invoices made before the declaration in lut-wording.ts, which still count as under LUT.
const EARLIER_LUT_NOTES = [
  "SUPPLY MEANT FOR EXPORT UNDER LETTER OF UNDERTAKING WITHOUT PAYMENT OF INTEGRATED TAX",
  "Export of services under LUT, without payment of IGST",
];

// PayPal's limit for an invoice note, and the room kept free in it for the lines Dueline adds after
// the freelancer's own words: the LUT declaration, ARN and place of supply (about 150 characters) and
// the early-payment line (about 70).
export const NOTE_LIMIT = 4000;
export const ADDED_LINES_ROOM = 300;

export function requestMemo(
  requestId: string,
  purposeCode: string | null = null,
  sac: string | null = null,
  split: SplitTag | null = null,
): string {
  return memoOf(`${MEMO_PREFIX}${requestId}`, purposeCode, sac, split);
}

export function mentionsLut(note: string | undefined): boolean {
  if (note === undefined) return false;
  return [LUT_DECLARATION, ...EARLIER_LUT_NOTES].some((text) => note.includes(text));
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
function nameOf(fullName: string): { given_name: string; surname?: string } | undefined {
  const words = fullName.split(/\s+/).filter(Boolean);
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
  const { invoiceNumber, invoiceDate, requestId, profile, discount, split } = options;
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
  const contact = nameOf(draft.client.contactName ?? "");

  return {
    detail: {
      invoice_number: invoiceNumber,
      invoice_date: invoiceDate,
      currency_code: draft.currency,
      ...(note ? { note } : {}),
      memo: requestMemo(requestId, draft.purposeCode, draft.items[0]?.sac ?? null, split),
      payment_term: { term_type: "DUE_ON_DATE_SPECIFIED", due_date: dueDate },
    },
    ...(invoicer ? { invoicer } : {}),
    primary_recipients: [
      {
        billing_info: {
          email_address: draft.client.email,
          business_name: draft.client.name,
          ...(contact ? { name: contact } : {}),
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
