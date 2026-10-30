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
  payoutInr: number | null; // rupees expected in the bank: PayPal's netInr when reported; otherwise PayPal's net converted at the estimated PayPal rate (paid invoices); otherwise the estimate for the amount still due (unpaid invoices)
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
  marketRateDate: string; // date of the rate used
  marketRateSource: "ecb" | "manual";
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
  fixedFees: Record<CurrencyCode, string>; // default USD "0.30", EUR "0.35", GBP "0.20", CAD "0.30", AUD "0.30"
  fxMarkupPercent: number; // default 3.0
  rateSource: "ecb" | "manual"; // ecb = daily European Central Bank rate via Frankfurter
  marketRates: Record<CurrencyCode, number>; // rupees per unit; used as-is when rateSource is "manual"
  ratesUpdatedOn: string; // date of the rates in use
}
// Defaults: PayPal India's published fees for international commercial payments, from
// paypal.com/in/webapps/mpp/merchant-fees, checked on 29 Oct 2026.

// src/types/api.ts
export interface ApiError {
  error: { code: string; message: string; debugId?: string };
}
```

## Endpoints

| Method and path                                     | Request body                                                                                     | Success response                                                                                                                                                   | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/health`                                   | none                                                                                             | `{ paypal: "connected" \| "error", ai: "ready" \| "missing_key", storage: "postgres" \| "memory" \| "error", mode: "sandbox", today: string, demoClock: boolean }` | Used by the sidebar status line and uptime checks. `today` is the date the app is using                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `GET /api/invoices`                                 | none                                                                                             | `{ invoices: InvoiceSummary[], totals: Totals }`                                                                                                                   | Newest first. Front end polls every 10 s on the receivables page                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `POST /api/invoices/extract`                        | `{ chat: string }` (1 to 6,000 chars)                                                            | `{ draft: InvoiceDraft, warnings: string[], risk: ClientRisk \| null, masked: { emails: number, phones: number } }`                                                | Emails and phone numbers are masked before the AI call and restored by code; `masked` counts them. Every field is re-checked in code and `warnings` names anything not found or corrected, e.g. "No due date found". `risk` is `null` until the late-payer radar is built. 10 extractions an hour per address (`429 rate_limited`) and 400 model calls a day for the whole app (`503 ai_unavailable`); an identical chat on the same day is answered from a 24-hour cache that counts towards neither. `422 extraction_failed` when no item is usable |
| `POST /api/payout-estimate`                         | `{ amount: Money }`                                                                              | `PayoutEstimate`                                                                                                                                                   | Pure calculation from settings and the day's market rate, no AI                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `POST /api/invoices`                                | `{ draft: InvoiceDraft, requestId: string, discount?: { percent: number, withinDays: number } }` | `{ invoice: InvoiceSummary, sent: boolean }`                                                                                                                       | Creates the draft, then sends it. A repeated `requestId` returns the stored result. If sending fails, returns 200 with `sent: false` and the draft, so the user can retry                                                                                                                                                                                                                                                                                                                                                                             |
| `POST /api/invoices/{id}/send`                      | `{ requestId: string }`                                                                          | `{ invoice: InvoiceSummary, sent: true }`                                                                                                                          | Retries sending an existing draft                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `GET /api/purpose-codes`                            | none                                                                                             | `{ codes: PurposeCode[] }`                                                                                                                                         | Fixed list from `src/lib/export/purpose-codes.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `GET /api/export-register?month=YYYY-MM`            | none                                                                                             | `ExportRegister`                                                                                                                                                   | Paid invoices in that month                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `GET /api/export-register?month=YYYY-MM&format=csv` | none                                                                                             | CSV file (`text/csv`, attachment `dueline-export-YYYY-MM.csv`)                                                                                                     | Same rows, for a chartered accountant                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `POST /api/demo/reset`                              | none                                                                                             | `204`                                                                                                                                                              | Demo mode only, behind the demo password: re-seeds the sandbox demo                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `POST /api/demo/session`                            | `{ password: string }` (1 to 200 chars)                                                          | `204` and sets the `dueline_demo` cookie                                                                                                                           | Public. `401 unauthorized` for a wrong password; `429 rate_limited` after 10 attempts in 15 minutes from one address                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `DELETE /api/demo/session`                          | none                                                                                             | `204` and clears the cookie                                                                                                                                        | Public                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `GET /api/clients/risk?email=`                      | none                                                                                             | `ClientRisk`                                                                                                                                                       | Used on the review screen once an email is known                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `GET /api/reminders`                                | none                                                                                             | `{ drafts: ReminderDraft[] }`                                                                                                                                      | One draft per overdue invoice, in its suggested tone                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `POST /api/reminders/draft`                         | `{ invoiceId: string, tone: Tone }`                                                              | `ReminderDraft`                                                                                                                                                    | Re-drafts in another tone                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `POST /api/reminders/send`                          | `{ invoiceId: string, subject: string, message: string, requestId: string }`                     | `{ sentAt: string }`                                                                                                                                               | Sends through PayPal's invoice reminder                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `GET /api/activity`                                 | none                                                                                             | `{ events: ActivityEvent[] }`                                                                                                                                      | Latest 20 from the store, newest first. Fed by webhooks                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `GET /api/settings` / `PUT /api/settings`           | PUT: `Settings`                                                                                  | `Settings`                                                                                                                                                         | Stored in Postgres (memory when no database is configured)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `POST /api/webhooks/paypal`                         | PayPal event, raw body up to 100 KB                                                              | `204`                                                                                                                                                              | Back end only, public. Signature verified by PayPal's postback, event ID de-duplicated. An invoice event re-reads the invoice from PayPal; paid and sent events record activity. `400 invalid_webhook` when headers are missing or verification fails; `500` when processing fails, so PayPal retries                                                                                                                                                                                                                                                 |

## Errors

Every failure returns a non-2xx status and an `ApiError`:

| Status | `code`                  | When                                                                                                   |
| ------ | ----------------------- | ------------------------------------------------------------------------------------------------------ |
| 400    | `invalid_request`       | Body fails zod validation; `message` says which field                                                  |
| 400    | `invalid_webhook`       | Webhook headers are missing, the body is too large or PayPal could not verify the signature            |
| 401    | `unauthorized`          | No valid demo cookie, or the demo password is wrong                                                    |
| 403    | `recipient_not_allowed` | Demo mode and the email is not a PayPal sandbox buyer address                                          |
| 404    | `not_found`             | Unknown invoice id                                                                                     |
| 409    | `duplicate_request`     | `requestId` already used for a different body                                                          |
| 422    | `extraction_failed`     | AI could not produce a usable draft                                                                    |
| 429    | `rate_limited`          | Too many AI calls or sign-in attempts; `message` says when to retry                                    |
| 500    | `config_error`          | The server is missing or has invalid configuration; `message` names the setting, never its value       |
| 500    | `internal_error`        | Unexpected server error; the message asks the user to try again and nothing about the cause is exposed |
| 502    | `paypal_error`          | PayPal returned an error; `debugId` carries PayPal's `debug_id`                                        |
| 503    | `ai_unavailable`        | Gemini quota or outage; the user can still fill the form by hand                                       |

## Demo access

A shared demo password protects a public deployment. `POST /api/demo/session` checks it and sets a
signed cookie named `dueline_demo` (HttpOnly, SameSite=Lax, Path=/, 7 days, Secure in production).

- Every `/api` route needs the cookie, except `GET /api/health`, `POST /api/webhooks/paypal` and
  `/api/demo/session`. Without it the route answers `401 unauthorized` with "Enter the demo password
  to continue."
- The screens `/receivables`, `/invoices/new`, `/nudges`, `/export` and `/settings` redirect to
  `/demo?next=<path>`. The landing page stays public.
- Access is on when `DEMO_PASSWORD` is set. In production `DEMO_PASSWORD` and `SESSION_SECRET` are
  both required: without them protected routes answer `500 config_error` and protected screens show
  "This deployment is not configured". In development and tests an unset `DEMO_PASSWORD` leaves
  access open.

## Dates and the demo clock

"Today" always comes from `src/lib/clock.ts`. When `DEMO_TODAY` is set
(`YYYY-MM-DD`), every due-state, overdue and risk calculation uses that date,
and the UI shows a small "Demo date" label. This lets real sandbox invoices
appear overdue in the demo without faking PayPal data.

## Stub routes

Until a route is implemented, its handler returns the matching fixture from
`src/mocks/fixtures.ts` and sets the header `x-dueline-stub: true`. Screens
must behave the same either way. Every stub is replaced before submission.
