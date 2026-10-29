import { daysBetween, toKolkataDate } from "@/lib/clock";
import { isPurposeCode } from "@/lib/export/purpose-codes";
import { fromMinorUnits, toMinorUnits } from "@/lib/money/decimal";
import {
  currencySchema,
  type ActualPayout,
  type DueState,
  type InvoiceSummary,
  type Money,
} from "@/types";
import type { PayPalInvoice, PayPalPayment } from "./types";

const DUE_SOON_DAYS = 3;
const PAID_STATUSES = ["PAID", "MARKED_AS_PAID"];
export const PAYOUT_STATUSES = [...PAID_STATUSES, "PARTIALLY_PAID"];

export function toMoney(currencyCode: string, value: string): Money | null {
  const currency = currencySchema.safeParse(currencyCode);
  return currency.success ? { currency: currency.data, value } : null;
}

export function latestPayment(invoice: PayPalInvoice): PayPalPayment | undefined {
  const dated = (invoice.payments?.transactions ?? []).filter((payment) => payment.payment_date);
  return dated.sort((a, b) => (a.payment_date ?? "").localeCompare(b.payment_date ?? "")).at(-1);
}

// A partly paid invoice owes less than its full amount, and only that part is still to arrive.
export function amountDueOf(invoice: PayPalInvoice, amount: Money): Money {
  const paid = invoice.payments?.paid_amount;
  if (!paid || paid.currency_code !== amount.currency) return amount;
  const due = Math.max(0, toMinorUnits(amount.value) - toMinorUnits(paid.value));
  return { currency: amount.currency, value: fromMinorUnits(due) };
}

function clientOf(invoice: PayPalInvoice): InvoiceSummary["client"] {
  const billing = invoice.primary_recipients?.[0]?.billing_info;
  const email = billing?.email_address ?? "";
  const person = [billing?.name?.given_name, billing?.name?.surname].filter(Boolean).join(" ");
  return { name: billing?.business_name || person || email, email };
}

function dueStateOf(paid: boolean, dueOn: string, today: string): DueState {
  if (paid) return "paid";
  if (today > dueOn) return "overdue";
  return daysBetween(today, dueOn) <= DUE_SOON_DAYS ? "due_soon" : "on_time";
}

export function toInvoiceSummary(
  invoice: PayPalInvoice,
  today: string,
  actualPayout: ActualPayout | null,
): InvoiceSummary | null {
  const amount = invoice.amount
    ? toMoney(invoice.amount.currency_code, invoice.amount.value)
    : null;
  if (!amount) return null;

  const issuedOn = invoice.detail.invoice_date;
  const dueOn = invoice.detail.payment_term?.due_date ?? issuedOn;
  const dueState = dueStateOf(PAID_STATUSES.includes(invoice.status), dueOn, today);
  const paymentDate = latestPayment(invoice)?.payment_date;
  const paidOn = dueState === "paid" && paymentDate ? toKolkataDate(paymentDate) : null;
  const lateUntil = dueState === "paid" ? paidOn : today;
  const reference = invoice.detail.reference ?? "";

  return {
    id: invoice.id,
    number: invoice.detail.invoice_number,
    client: clientOf(invoice),
    work: invoice.items?.[0]?.name ?? "",
    amount,
    issuedOn,
    dueOn,
    paidOn,
    paypalStatus: invoice.status,
    dueState,
    daysLate: lateUntil ? Math.max(0, daysBetween(dueOn, lateUntil)) : 0,
    payoutInr: null,
    actualPayout,
    purposeCode: isPurposeCode(reference) ? reference : null,
    payLink: invoice.detail.metadata?.recipient_view_url ?? "",
  };
}
