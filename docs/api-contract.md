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
  paidOn: string | null; // India date of actualPayout.paidAt when known, otherwise PayPal's payment_date
  paypalStatus: string; // raw PayPal status, e.g. "UNPAID", "PAID"
  dueState: DueState;
  daysLate: number; // 0 unless overdue (or paid late)
  payoutInr: number | null; // rupees expected in the bank: PayPal's netInr when reported; otherwise PayPal's net converted at the estimated PayPal rate (paid invoices); otherwise the estimate for the amount still due (unpaid invoices)
  actualPayout: ActualPayout | null; // PayPal's own figures once paid, when available
  purposeCode: string | null; // RBI purpose code chosen for this invoice
  payLink: string; // PayPal-hosted link the client pays on
  riskLevel: RiskLevel | null; // the late-payer radar's level for this client; null when there is no history to judge
}

export interface ActualPayout {
  fee: Money; // PayPal fee reported for the payment
  net: Money; // amount after the fee, in the invoice currency
  exchangeRate: number | null; // rupees per unit if PayPal reports a conversion
  netInr: number | null; // rupees received if PayPal reports them
  source: "paypal_capture" | "invoice_payment"; // where the figures came from
  paidAt: string | null; // ISO timestamp of the payment, from the capture or the transaction; null when PayPal gave none
  transactionId: string; // PayPal payment (capture) id; the transaction ID on PayPal's FIRA
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
  dueOn: string | null; // today + 14 days when the chat states no payment terms; null when the stated date is in the past
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
  clientCountry: string | null; // last part of the client's location, when known
  paidOn: string; // India date
  foreign: Money; // invoice amount
  fee: Money | null; // PayPal's fee; null until PayPal reports it
  net: Money | null; // amount after the fee, in the invoice currency; null until PayPal reports it
  inrReceived: number; // whole rupees
  inrSource: "paypal" | "estimate";
  rateUsed: number | null; // rupees per unit after PayPal's markup, when rupees are estimated
  rateDate: string | null; // date of the ECB rate used, when rupees are estimated
  purposeCode: string | null;
  underLut: boolean; // the invoice note carries the LUT line
  transactionId: string | null; // PayPal's transaction ID, to match the FIRA: the capture or transaction PayPal reported, otherwise the invoice's own latest payment ID
}

export interface ExportRegister {
  month: string; // "YYYY-MM", in India time
  rows: ExportRegisterRow[];
  totalInr: number;
  totalsByCurrency: Money[]; // foreign invoice totals, one per currency
  paypalInr: number; // part of totalInr that PayPal reported
  estimatedInr: number; // part of totalInr that is estimated
  missingPurposeCodes: number; // rows without a purpose code
  recordedOutsidePayPal: string[]; // numbers of invoices marked as paid outside PayPal in the month; not rows, not in any total
}

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
  clientName: string; // the client's name as invoiced; a client is the pair (normalised name, email)
  invoicesConsidered: number; // the client's invoices that are paid or overdue
  lateCount: number;
  averageDaysLate: number;
  level: RiskLevel;
  suggestion: { kind: "early_payment_discount"; percent: number; withinDays: number } | null;
  reason: string; // one plain sentence, written by code from the numbers (no AI)
}

// src/types/reminder.ts
export type Tone = "gentle" | "firm" | "final";
export interface ReminderDraft {
  invoiceId: string;
  tone: Tone;
  suggestedTone: Tone;
  subject: string;
  message: string;
  source: "ai" | "template"; // template when AI is unavailable, the daily cap is reached or the output failed a check
  history: { tone: Tone; sentAt: string }[]; // reminders Dueline sent for this invoice, oldest first
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

| Method and path                                     | Request body                                                                                     | Success response                                                                                                                                                   | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/health`                                   | none                                                                                             | `{ paypal: "connected" \| "error", ai: "ready" \| "missing_key", storage: "postgres" \| "memory" \| "error", mode: "sandbox", today: string, demoClock: boolean }` | Used by the sidebar status line and uptime checks. `today` is the date the app is using. The receivables screen re-reads it every 5 minutes, so the date stays right if the tab is left open past midnight                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `GET /api/invoices`                                 | none                                                                                             | `{ invoices: InvoiceSummary[], totals: Totals }`                                                                                                                   | Newest first. Front end polls every 10 s on the receivables page                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `POST /api/invoices/extract`                        | `{ chat: string }` (1 to 6,000 chars)                                                            | `{ draft: InvoiceDraft, warnings: string[], risk: ClientRisk \| null, masked: { emails: number, phones: number } }`                                                | Emails and phone numbers are masked before the AI call and restored by code; `masked` counts them. Every field is re-checked in code and `warnings` names anything not found or corrected, e.g. "No payment terms in the chat; due date set to 14 days from today. Change it if needed.". `risk` is the late-payer radar's reading of the draft's client (`GET /api/clients/risk`), or `null` when the draft has no client email or the reading could not be made. 10 extractions an hour per address (`429 rate_limited`) and 400 model calls a day for the whole app (`503 ai_unavailable`); an identical chat on the same day is answered from a 24-hour cache that counts towards neither. `422 extraction_failed` when no item is usable                                                                                                                                                                  |
| `POST /api/payout-estimate`                         | `{ amount: Money }`                                                                              | `PayoutEstimate`                                                                                                                                                   | Pure calculation from settings and the day's market rate, no AI                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `POST /api/invoices`                                | `{ draft: InvoiceDraft, requestId: string, discount?: { percent: number, withinDays: number } }` | `{ invoice: InvoiceSummary, sent: boolean }`                                                                                                                       | Creates the draft, then sends it. The server checks and recomputes everything, and in demo mode refuses a recipient that is not a PayPal sandbox buyer. `dueOn` must be today or later (`400 invalid_request`). `discount` is PayPal's own invoice discount (`percent` 1 to 20, `withinDays` 3 to 30), and the due date becomes the earlier of `dueOn` and `withinDays` after the invoice date. A repeated `requestId` returns the stored result. A request still in progress is `409 duplicate_request`: "This invoice is still being created. Check Receivables before trying again." If sending fails, returns 200 with `sent: false` and the draft, so the user can retry. If PayPal rejects the create, nothing was created, the `requestId` is released and the answer is `502 paypal_error`. If PayPal does not answer the create in time, the result is unknown and the answer is `504 paypal_timeout` |
| `POST /api/invoices/{id}/send`                      | `{ requestId: string }`                                                                          | `{ invoice: InvoiceSummary, sent: true }`                                                                                                                          | Retries sending an existing draft. An invoice PayPal already shows as sent is returned without a second send. `404 not_found` for an unknown id                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `GET /api/purpose-codes`                            | none                                                                                             | `{ codes: PurposeCode[] }`                                                                                                                                         | Fixed list from `src/lib/export/purpose-codes.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `GET /api/demo/recipient`                           | none                                                                                             | `{ email: string }`                                                                                                                                                | The sandbox buyer's address from `SANDBOX_BUYER_EMAIL`, for the review screen's "Send to the demo buyer" button. `404 not_found` unless `DEMO_MODE` is on and the address is set                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `GET /api/export-register?month=YYYY-MM`            | none                                                                                             | `ExportRegister`                                                                                                                                                   | Invoices paid in that month in India time (the date of PayPal's payment timestamp, not PayPal's own `payment_date`), sorted by paid date then invoice number. Invoices paid through PayPal only; a partly paid invoice is left out until it is paid in full. An invoice marked as paid outside PayPal has no PayPal payment or FIRA line, so it is not a row and not in the rupee totals; its number is listed in `recordedOutsidePayPal` Rupees are PayPal's `netInr` when PayPal reports a conversion, otherwise PayPal's net at the ECB rate of the payment date less the settings' markup (`inrSource: "estimate"`). `400 invalid_request` for a month after the current one                                                                                                                                                                                                                               |
| `GET /api/export-register?month=YYYY-MM&format=csv` | none                                                                                             | CSV file (`text/csv; charset=utf-8`, attachment `dueline-export-YYYY-MM.csv`)                                                                                      | Same rows, for a chartered accountant, followed by a blank line and "Recorded outside PayPal (not on PayPal's FIRA): N" with the numbers when there are any (the columns do not change). UTF-8 with a byte order mark, quoted as RFC 4180. A text cell starting with `=`, `+`, `-`, `@`, tab or carriage return gets a leading `'` so a spreadsheet does not run it as a formula                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `POST /api/demo/reset`                              | none                                                                                             | `{ cancelled: number, deleted: number, created: number, skipped: number, failed: number }`                                                                         | Demo mode only (`404 not_found` otherwise), behind the demo password. Cancels every sent or unpaid invoice that is not part of the demo story (sending no emails), deletes every draft, then creates the story invoices PayPal does not have yet and records the history ones as paid outside PayPal. Paid, marked-as-paid and partly paid invoices are never touched. Once every 10 minutes for the whole app (`429 rate_limited`: "The demo was reset a few minutes ago. Try again in N minutes.")                                                                                                                                                                                                                                                                                                                                                                                                           |
| `POST /api/demo/session`                            | `{ password: string }` (1 to 200 chars)                                                          | `204` and sets the `dueline_demo` cookie                                                                                                                           | Public. `401 unauthorized` for a wrong password; `429 rate_limited` after 10 attempts in 15 minutes from one address                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `DELETE /api/demo/session`                          | none                                                                                             | `204` and clears the cookie                                                                                                                                        | Public                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `GET /api/clients/risk?email=&name=`                | none                                                                                             | `ClientRisk`                                                                                                                                                       | `name` is optional. The client's invoices are those whose recipient email matches and, when `name` is given, whose name matches after trimming, collapsing spaces and ignoring case. Used on the review screen and in the invoice panel. See "Late-payer radar"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `GET /api/reminders`                                | none                                                                                             | `{ drafts: ReminderDraft[] }`                                                                                                                                      | One draft per overdue invoice (sent, unpaid or partly paid), in its suggested tone, most days late first, at most 10. See "Reminders"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `POST /api/reminders/draft`                         | `{ invoiceId: string, tone: Tone }`                                                              | `ReminderDraft`                                                                                                                                                    | Re-drafts one overdue invoice in another tone. `404 not_found` for an unknown invoice, `400 invalid_request` when it is paid or not overdue. 20 drafts an hour per address (`429 rate_limited`). See "Reminders"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `POST /api/reminders/send`                          | `{ invoiceId: string, subject: string, message: string, tone: Tone, requestId: string }`         | `{ sentAt: string }`                                                                                                                                               | Sends through PayPal's invoice reminder, which carries the invoice and its Pay now link. `subject` is 5 to 120 and `message` 20 to 900 characters, with no links or email addresses, not counting the client's business name or the work description (`400 invalid_request`: "The subject must not contain links or email addresses." or the same for the message; a length error names the field). A repeated `requestId` returns the stored `sentAt`. See "Reminders"                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `GET /api/activity`                                 | none                                                                                             | `{ events: ActivityEvent[] }`                                                                                                                                      | Latest 20 from the store, newest first. Fed by webhooks                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `GET /api/settings` / `PUT /api/settings`           | PUT: `Settings`                                                                                  | `Settings`                                                                                                                                                         | Stored in Postgres (memory when no database is configured)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `POST /api/webhooks/paypal`                         | PayPal event, raw body up to 100 KB                                                              | `204`                                                                                                                                                              | Back end only, public. Signature verified by PayPal's postback, event ID de-duplicated. An invoice event re-reads the invoice from PayPal; paid and sent events record activity. `400 invalid_webhook` when headers are missing or verification fails; `500` when processing fails, so PayPal retries                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |

## Errors

Every failure returns a non-2xx status and an `ApiError`:

| Status | `code`                  | When                                                                                                   |
| ------ | ----------------------- | ------------------------------------------------------------------------------------------------------ |
| 400    | `invalid_request`       | Body fails zod validation; `message` says which field                                                  |
| 400    | `invalid_webhook`       | Webhook headers are missing, the body is too large or PayPal could not verify the signature            |
| 401    | `unauthorized`          | No valid demo cookie, or the demo password is wrong                                                    |
| 403    | `recipient_not_allowed` | Demo mode and the email is not a PayPal sandbox buyer address                                          |
| 404    | `not_found`             | Unknown invoice id                                                                                     |
| 409    | `duplicate_request`     | `requestId` already used for a different body, or its request is still in progress                     |
| 422    | `extraction_failed`     | AI could not produce a usable draft                                                                    |
| 429    | `rate_limited`          | Too many AI calls, sign-in attempts or demo resets; `message` says when to retry                       |
| 500    | `config_error`          | The server is missing or has invalid configuration; `message` names the setting, never its value       |
| 500    | `internal_error`        | Unexpected server error; the message asks the user to try again and nothing about the cause is exposed |
| 502    | `paypal_error`          | PayPal returned an error; `debugId` carries PayPal's `debug_id`                                        |
| 503    | `ai_unavailable`        | Gemini quota or outage; the user can still fill the form by hand                                       |
| 504    | `paypal_timeout`        | PayPal did not answer while creating an invoice, so the result is unknown; check Receivables           |

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

## Late-payer radar

A client is the pair (normalised billing name, email), never the email alone: in the demo every
invoice goes to the same sandbox buyer. The names are compared after trimming, collapsing spaces
and ignoring case. Only the client's invoices that are **paid or overdue** are considered; an
invoice that is open and not yet due says nothing yet.

- `lateCount`: invoices paid after their due date, plus invoices overdue now.
- `averageDaysLate`: the mean of days late over those, to one decimal.
- `level`: `reliable` when `lateCount` is 0 or every late invoice was 2 days late or less;
  `late_payer` when `lateCount` is at least 2 and `averageDaysLate` is at least 5, or any invoice is
  more than 30 days overdue; otherwise `watch`.
- `suggestion`: `late_payer` gives an early-payment discount of 2% if paid within 7 days, `watch`
  1% within 7 days, `reliable` none. The review screen offers it as a button; nothing is applied
  without a click.
- `reason` is written by code from the numbers, for example "Okafor & Reyes paid 2 of 3 invoices
  late, 14 days on average."

## Reminders

- **Tones.** `gentle`, `firm` and `final`. The suggested tone is `gentle` for 1 to 7 days late with
  no reminder sent, `firm` for 8 to 20 days late or one reminder sent, and `final` for more than 20
  days late or two or more sent.
- **Drafting.** Gemini writes the subject and message from the invoice's facts, and code checks the
  result: subject 5 to 120 characters, message 20 to 900, the invoice number present, any money
  amount equal to the invoice amount, and no links or email addresses. The client's business name and the invoice's work description are removed first, so a client called "Acme.io" is not a link. Otherwise, and when AI is
  unavailable or the app's daily allowance is used up, a template written in code is used.
  `source` says which. Drafts are cached for 24 hours per invoice, tone and days late.
- **Limits.** Drafts that call the model count towards the app's 400 calls a day, and
  `POST /api/reminders/draft` allows 20 an hour per address. PayPal allows two reminders a day per
  caller, and Dueline sends at most one per invoice per India day.
- **Sending.** The invoice must be sent and unpaid or partly paid, and overdue. Otherwise
  `400 invalid_request`: "This invoice is already paid." or "This invoice is not overdue.". In demo
  mode a recipient that is not a sandbox buyer is `403 recipient_not_allowed`, before PayPal is
  asked to send the reminder. A second reminder for the same invoice on the same India day is `429 rate_limited`: "A
  reminder was already sent today for this invoice.". When PayPal answers 429 the request ID is
  released and the answer is `429 rate_limited`: "PayPal allows two reminders a day for this account.
  Try again tomorrow.". A repeated `requestId` with the same body returns the stored `sentAt`
  without calling PayPal; with another body it is `409 duplicate_request`.
- **Activity.** A sent reminder records an `ActivityEvent` of kind `reminder_sent` with the id
  `reminder:<requestId>`, and is kept in the invoice's reminder history.

## Dates and the demo clock

"Today" always comes from `src/lib/clock.ts`. When `DEMO_TODAY` is set
(`YYYY-MM-DD`), every due-state, overdue and risk calculation uses that date,
and the UI shows a small "Demo date" label. This lets real sandbox invoices
appear overdue in the demo without faking PayPal data.

## Demo story

In demo mode the sandbox holds a fixed story of eight invoices to five clients, defined in
`src/lib/demo/story.ts` with every date as an offset from `today()`. Each carries the memo
`dueline-demo:<key>`. Older invoices are recorded as paid outside PayPal (`BANK_TRANSFER`, type
`EXTERNAL`) so the late-payer radar has history; `npm run seed` and `POST /api/demo/reset` create
only what is missing. See [decision 0015](decisions/0015-demo-story-and-reset.md).
