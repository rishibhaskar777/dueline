import { addDays, addMonths } from "@/lib/date-math";
import { LUT_DECLARATION } from "@/lib/paypal/invoice-body";
import { memoOf } from "@/lib/paypal/memo";
import { estimatePayout } from "@/lib/money/payout";
import type { PayPalInvoice } from "@/lib/paypal/types";
import { DEFAULT_SETTINGS, type ActualPayout, type Money } from "@/types";
import type { FakePayPal } from "./fake-paypal";

interface PaidInvoice {
  key: string;
  number: string;
  clientName: string;
  work: string;
  amount: Money;
  purposeCode: string;
  underLut: boolean;
  // Days from the due date to the day PayPal received the payment; negative is early.
  daysFromDue: number;
  // The day of last month the payment arrived, or null for a payment two days ago.
  paidOnDay: number | null;
}

const SAC = "998391";
const PAYMENT_TIME = "T09:30:00Z";
const TERMS_DAYS = 14;

// Payments that came through PayPal, so the export register and the payout figures have PayPal's
// own numbers to show. The demo story's older invoices were paid outside PayPal and have none.
const PAID_INVOICES: PaidInvoice[] = [
  {
    key: "halden-packaging",
    number: "INV-0041",
    clientName: "Halden Coffee Co.",
    work: "Packaging illustrations",
    amount: { currency: "USD", value: "640.00" },
    purposeCode: "P1099",
    underLut: true,
    daysFromDue: -2,
    paidOnDay: 6,
  },
  {
    key: "northpine-banners",
    number: "INV-0042",
    clientName: "Northpine Studio",
    work: "Campaign banners",
    amount: { currency: "CAD", value: "410.00" },
    purposeCode: "P1007",
    underLut: true,
    daysFromDue: 0,
    paidOnDay: 14,
  },
  {
    key: "tandem-onboarding",
    number: "INV-0043",
    clientName: "Tandem Health",
    work: "Onboarding screens",
    amount: { currency: "USD", value: "1150.00" },
    purposeCode: "P1099",
    underLut: false,
    daysFromDue: 4,
    paidOnDay: 21,
  },
  {
    key: "brightwell-dashboard-icons",
    number: "INV-0044",
    clientName: "Brightwell Labs",
    work: "Dashboard icons",
    amount: { currency: "GBP", value: "300.00" },
    purposeCode: "P1099",
    underLut: true,
    daysFromDue: 1,
    paidOnDay: null,
  },
];

function paidOn(invoice: PaidInvoice, today: string): string {
  if (invoice.paidOnDay === null) return addDays(today, -2);
  const day = String(invoice.paidOnDay).padStart(2, "0");
  return `${addMonths(today.slice(0, 7), -1)}-${day}`;
}

function paidInvoiceOf(
  invoice: PaidInvoice,
  dates: { issuedOn: string; dueOn: string; paidAt: string },
  paymentId: string,
  buyerEmail: string,
): Partial<PayPalInvoice> {
  const { issuedOn, dueOn, paidAt } = dates;
  const total = { currency_code: invoice.amount.currency, value: invoice.amount.value };
  return {
    detail: {
      invoice_number: invoice.number,
      invoice_date: issuedOn,
      currency_code: invoice.amount.currency,
      ...(invoice.underLut ? { note: LUT_DECLARATION } : {}),
      memo: memoOf(`dueline-offline:${invoice.key}`, invoice.purposeCode, SAC),
      payment_term: { term_type: "DUE_ON_DATE_SPECIFIED", due_date: dueOn },
      metadata: {
        create_time: `${issuedOn}T05:00:00Z`,
        first_sent_time: `${issuedOn}T05:01:00Z`,
        recipient_view_url: `https://paypal.invalid/offline-invoice/${invoice.key}`,
      },
    },
    primary_recipients: [
      { billing_info: { email_address: buyerEmail, business_name: invoice.clientName } },
    ],
    items: [{ name: invoice.work, description: `SAC ${SAC}`, quantity: "1", unit_amount: total }],
    amount: total,
    payments: {
      paid_amount: total,
      transactions: [
        { payment_id: paymentId, payment_date: paidAt, method: "PAYPAL", amount: total },
      ],
    },
  };
}

function captureOf(invoice: PaidInvoice, paymentId: string, paidAt: string): ActualPayout {
  const payout = estimatePayout(invoice.amount, DEFAULT_SETTINGS, {
    value: DEFAULT_SETTINGS.marketRates[invoice.amount.currency],
    onDate: DEFAULT_SETTINGS.ratesUpdatedOn,
    source: "manual",
  });
  return {
    fee: payout.fee,
    net: payout.net,
    exchangeRate: payout.conversionRate,
    netInr: payout.netInr,
    source: "paypal_capture",
    paidAt,
    transactionId: paymentId,
  };
}

export function addPaidInvoices(fake: FakePayPal, today: string, buyerEmail: string): void {
  for (const invoice of PAID_INVOICES) {
    const paid = paidOn(invoice, today);
    const dueOn = addDays(paid, -invoice.daysFromDue);
    const issuedOn = addDays(dueOn, -TERMS_DAYS);
    const paymentId = `OFFLINE-CAPTURE-${invoice.key}`;
    const paidAt = `${paid}${PAYMENT_TIME}`;

    fake.add(
      "PAID",
      undefined,
      paidInvoiceOf(invoice, { issuedOn, dueOn, paidAt }, paymentId, buyerEmail),
    );
    fake.captures.set(paymentId, captureOf(invoice, paymentId, paidAt));
  }
}
