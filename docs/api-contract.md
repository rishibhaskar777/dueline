# Dueline API contract

This file defines every type and endpoint shared by the screens and the server.
The types live in `src/types/` and must match it exactly. Any change to the
contract is made here first, in its own pull request.

All routes are under `/api`, accept and return JSON, and are server-only.
Dates are `YYYY-MM-DD` strings; timestamps are ISO 8601 strings in UTC.
Money uses PayPal's shape: a decimal **string**, never a float.

## Shared types

```ts
// src/types/money.ts
export type CurrencyCode = "USD" | "EUR" | "GBP" | "CAD" | "AUD";
export interface Money {
  currency: CurrencyCode;
  value: string;
} // e.g. { currency: "USD", value: "450.00" }

// src/types/invoice.ts
export type DueState = "paid" | "on_time" | "due_soon" | "overdue"; // due_soon = due within 3 days

export interface Client {
  name: string;
  email: string;
  location?: string;
}

export interface InvoiceSummary {
  id: string; // PayPal invoice id, e.g. "INV2-XXXX-XXXX-XXXX-XXXX"
  number: string; // human number, e.g. "INV-0046"
  client: Client;
  work: string; // short description of the work
  amount: Money;
  issuedOn: string; // date sent
  dueOn: string;
  paidOn: string | null;
  paypalStatus: string; // raw PayPal status, e.g. "UNPAID", "PAID"
  dueState: DueState;
  daysLate: number; // 0 unless overdue (or paid late)
  payoutInr: number | null; // estimated rupees after fees and conversion
  actualPayout: ActualPayout | null; // PayPal's own figures once paid, when available
  purposeCode: string | null; // RBI purpose code chosen for this invoice
  payLink: string; // PayPal-hosted link the client pays on
}

export interface ActualPayout {
  fee: Money; // PayPal fee reported for the payment
  net: Money; // amount after the fee, in the invoice currency
  exchangeRate: number | null; // rupees per unit if PayPal reports a conversion
  netInr: number | null; // rupees received if PayPal reports them
  source: "paypal_capture" | "invoice_payment"; // where the figures came from
}

export interface Totals {
  outstandingInr: number; // all unpaid, estimated after fees
  overdueInr: number;
  overdueCount: number;
  paidThisMonthInr: number;
}

export interface LineItem {
  name: string;
  quantity: number; // integer >= 1
  unitAmount: string; // decimal string in the invoice currency
  sourceQuote?: string; // words from the chat this item came from
}

export interface InvoiceDraft {
  client: Client;
  currency: CurrencyCode;
  dueOn: string | null; // null when the chat gave no date; the user must choose one
  items: LineItem[];
  note?: string;
  purposeCode: string | null; // suggestion from the fixed list, user can change
  purposeReason?: string; // one line on why that code was suggested
  includeLutNote: boolean; // adds "Export of services under LUT, without payment of IGST"
}

// src/types/export.ts
export interface PurposeCode {
  code: string;
  label: string;
  examples: string;
}

export interface ExportRegisterRow {
  invoiceId: string;
  invoiceNumber: string;
  clientName: string;
  clientCountry: string | null;
  paidOn: string;
  foreign: Money;
  inrReceived: number;
  inrSource: "paypal" | "estimate";
  purposeCode: string | null;
}

export interface ExportRegister {
  month: string;
  rows: ExportRegisterRow[];
  totalInr: number;
} // month = "YYYY-MM"

// src/types/payout.ts
export interface PayoutEstimate {
  gross: Money;
  fee: Money; // PayPal fee in invoice currency
  net: Money;
  conversionRate: number; // rupees per unit after PayPal's markup
  marketRate: number; // rupees per unit before markup
  netInr: number;
  lossInr: number; // market value minus netInr
  lossPercent: number; // one decimal place
}

// src/types/risk.ts
export type RiskLevel = "reliable" | "watch" | "late_payer";
export interface ClientRisk {
  clientEmail: string;
  invoicesConsidered: number;
  lateCount: number;
  averageDaysLate: number;
  level: RiskLevel;
  suggestion: { kind: "early_payment_discount"; percent: number; withinDays: number } | null;
  reason: string; // one plain sentence, may be written by AI from the numbers
}

// src/types/reminder.ts
export type Tone = "gentle" | "firm" | "final";
export interface ReminderDraft {
  invoiceId: string;
  tone: Tone;
  suggestedTone: Tone;
  subject: string;
  message: string;
  history: { tone: Tone; sentAt: string }[];
}

// src/types/activity.ts
export type ActivityKind = "paid" | "viewed" | "sent" | "overdue" | "reminder_sent";
export interface ActivityEvent {
  id: string;
  kind: ActivityKind;
  invoiceId: string;
  invoiceNumber: string;
  clientName: string;
  at: string; // ISO timestamp
  amount?: Money;
}

// src/types/settings.ts
export interface Settings {
  feePercent: number; // default 4.4
  fixedFee: string; // default "0.30" in invoice currency
  fxMarkupPercent: number; // default 3.5
  rateSource: "ecb" | "manual"; // ecb = daily European Central Bank rate via Frankfurter
  marketRates: Record<CurrencyCode, number>; // rupees per unit; used as-is when rateSource is "manual"
  ratesUpdatedOn: string; // date of the rates in use
}

// src/types/api.ts
export interface ApiError {
  error: { code: string; message: string; debugId?: string };
}
```

## Endpoints

| Method and path                                     | Request body                                                                                     | Success response                                                                                                                                                   | Notes                                                                                                                                                                     |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/health`                                   | none                                                                                             | `{ paypal: "connected" \| "error", ai: "ready" \| "missing_key", storage: "postgres" \| "memory" \| "error", mode: "sandbox", today: string, demoClock: boolean }` | Used by the sidebar status line and uptime checks. `today` is the date the app is using                                                                                   |
| `GET /api/invoices`                                 | none                                                                                             | `{ invoices: InvoiceSummary[], totals: Totals }`                                                                                                                   | Newest first. Front end polls every 10 s on the receivables page                                                                                                          |
| `POST /api/invoices/extract`                        | `{ chat: string }` (1 to 6,000 chars)                                                            | `{ draft: InvoiceDraft, warnings: string[], risk: ClientRisk \| null, masked: { emails: number, phones: number } }`                                                | Emails and phone numbers are masked before the AI call and restored by code. Warnings name anything not found, e.g. "No due date found"                                   |
| `POST /api/payout-estimate`                         | `{ amount: Money }`                                                                              | `PayoutEstimate`                                                                                                                                                   | Pure calculation from settings, no AI                                                                                                                                     |
| `POST /api/invoices`                                | `{ draft: InvoiceDraft, requestId: string, discount?: { percent: number, withinDays: number } }` | `{ invoice: InvoiceSummary, sent: boolean }`                                                                                                                       | Creates the draft, then sends it. A repeated `requestId` returns the stored result. If sending fails, returns 200 with `sent: false` and the draft, so the user can retry |
| `POST /api/invoices/{id}/send`                      | `{ requestId: string }`                                                                          | `{ invoice: InvoiceSummary, sent: true }`                                                                                                                          | Retries sending an existing draft                                                                                                                                         |
| `GET /api/purpose-codes`                            | none                                                                                             | `{ codes: PurposeCode[] }`                                                                                                                                         | Fixed list from `src/lib/export/purpose-codes.ts`                                                                                                                         |
| `GET /api/export-register?month=YYYY-MM`            | none                                                                                             | `ExportRegister`                                                                                                                                                   | Paid invoices in that month                                                                                                                                               |
| `GET /api/export-register?month=YYYY-MM&format=csv` | none                                                                                             | CSV file (`text/csv`, attachment `dueline-export-YYYY-MM.csv`)                                                                                                     | Same rows, for a chartered accountant                                                                                                                                     |
| `POST /api/demo/reset`                              | none                                                                                             | `204`                                                                                                                                                              | Demo mode only, behind the demo password: re-seeds the sandbox demo                                                                                                       |
| `GET /api/clients/risk?email=`                      | none                                                                                             | `ClientRisk`                                                                                                                                                       | Used on the review screen once an email is known                                                                                                                          |
| `GET /api/reminders`                                | none                                                                                             | `{ drafts: ReminderDraft[] }`                                                                                                                                      | One draft per overdue invoice, in its suggested tone                                                                                                                      |
| `POST /api/reminders/draft`                         | `{ invoiceId: string, tone: Tone }`                                                              | `ReminderDraft`                                                                                                                                                    | Re-drafts in another tone                                                                                                                                                 |
| `POST /api/reminders/send`                          | `{ invoiceId: string, subject: string, message: string, requestId: string }`                     | `{ sentAt: string }`                                                                                                                                               | Sends through PayPal's invoice reminder                                                                                                                                   |
| `GET /api/activity`                                 | none                                                                                             | `{ events: ActivityEvent[] }`                                                                                                                                      | Latest 20, newest first. Fed by webhooks                                                                                                                                  |
| `GET /api/settings` / `PUT /api/settings`           | PUT: `Settings`                                                                                  | `Settings`                                                                                                                                                         | Stored in Postgres (memory when no database is configured)                                                                                                                |
| `POST /api/webhooks/paypal`                         | PayPal event                                                                                     | `204`                                                                                                                                                              | Back end only. Signature verified, event ID de-duplicated                                                                                                                 |

## Errors

Every failure returns a non-2xx status and an `ApiError`:

| Status | `code`                  | When                                                             |
| ------ | ----------------------- | ---------------------------------------------------------------- |
| 400    | `invalid_request`       | Body fails zod validation; `message` says which field            |
| 401    | `unauthorized`          | Demo password missing or wrong                                   |
| 403    | `recipient_not_allowed` | Demo mode and the email is not a PayPal sandbox buyer address    |
| 404    | `not_found`             | Unknown invoice id                                               |
| 409    | `duplicate_request`     | `requestId` already used for a different body                    |
| 422    | `extraction_failed`     | AI could not produce a usable draft                              |
| 429    | `rate_limited`          | Too many AI calls; `message` says when to retry                  |
| 502    | `paypal_error`          | PayPal returned an error; `debugId` carries PayPal's `debug_id`  |
| 503    | `ai_unavailable`        | Gemini quota or outage; the user can still fill the form by hand |

## Dates and the demo clock

"Today" always comes from `src/lib/clock.ts`. When `DEMO_TODAY` is set
(`YYYY-MM-DD`), every due-state, overdue and risk calculation uses that date,
and the UI shows a small "Demo date" label. This lets real sandbox invoices
appear overdue in the demo without faking PayPal data.

## Stub routes

Until a route is implemented, its handler returns the matching fixture from
`src/mocks/fixtures.ts` and sets the header `x-dueline-stub: true`. Screens
must behave the same either way. Every stub is replaced before submission.
