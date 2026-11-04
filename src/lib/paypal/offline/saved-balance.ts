import { addDays } from "@/lib/date-math";
import { LUT_DECLARATION } from "@/lib/invoices/lut-wording";
import { memoOf } from "@/lib/paypal/memo";
import type { Money } from "@/types";
import type { FakePayPal } from "./fake-paypal";

const SAVED_DAYS_AGO = 10;
const DAYS_TO_PAY = 14;
const BALANCE: Money = { currency: "EUR", value: "615.00" };
const SAVED_BALANCE_NUMBER = "INV-0058";

// A balance invoice that was saved as a draft ten days ago, with a due date two weeks after that,
// so the offline demo can show it being dated again on the day it is sent.
export function addSavedBalance(fake: FakePayPal, today: string, buyerEmail: string): void {
  const savedOn = addDays(today, -SAVED_DAYS_AGO);
  const total = { currency_code: BALANCE.currency, value: BALANCE.value };
  fake.add("DRAFT", undefined, {
    detail: {
      invoice_number: SAVED_BALANCE_NUMBER,
      invoice_date: savedOn,
      currency_code: BALANCE.currency,
      note: LUT_DECLARATION,
      memo: memoOf("dueline-request:offline-saved-balance", "P1007", "998391", {
        role: "balance",
        id: "offline-saved-balance",
      }),
      payment_term: { term_type: "DUE_ON_DATE_SPECIFIED", due_date: addDays(savedOn, DAYS_TO_PAY) },
      metadata: { create_time: `${savedOn}T05:00:00Z` },
    },
    primary_recipients: [
      { billing_info: { email_address: buyerEmail, business_name: "Larkspur Interiors" } },
    ],
    items: [
      {
        name: "Balance (50%) for: Showroom lighting plan",
        description: "SAC 998391",
        quantity: "1",
        unit_amount: total,
      },
    ],
    amount: total,
  });
}
