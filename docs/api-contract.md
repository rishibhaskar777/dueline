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

// paypal: PayPal reported the rupees. estimate: worked out from PayPal's net or the published fees at
// an ECB rate. outside_paypal: the payment was made elsewhere, so no PayPal fee or markup applies.
export type PayoutSource = "paypal" | "estimate" | "outside_paypal";

export interface Client {
  name: string;
  email: string;
  country?: string; // ISO 3166-1 alpha-2 code of the client's country, from the list in src/lib/countries.ts (India is not on it)
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
  payoutInr: number | null; // whole rupees, by one rule everywhere (Receivables, panel, tooltip, Export register): a paid invoice is PayPal's netInr when reported, otherwise PayPal's net (or, with no PayPal figures, the estimate) at the ECB rate of the payment date less the markup; an invoice paid outside PayPal is its amount at the ECB rate of the payment date with no fee and no markup; an unpaid invoice is the estimate for the amount still due at today's rate
  payoutSource: PayoutSource | null; // where payoutInr came from; null while payoutInr is null
  rateDate: string | null; // date of the ECB rate behind a worked-out payoutInr; null when PayPal reported the rupees
  actualPayout: ActualPayout | null; // PayPal's own figures once paid, when available
  purposeCode: string | null; // RBI purpose code chosen for this invoice, kept in the invoice's private memo (older invoices: the reference field)
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
  paidLast30Inr: number; // rupees from invoices paid in the last 30 days (today and the 29 before, India dates), through PayPal and outside it
  paidLast30PayPalInr: number; // the part through PayPal
  paidLast30OutsideInr: number; // the part recorded as paid outside PayPal
}

export interface LineItem {
  name: string;
  quantity: number; // integer >= 1
  unitAmount: string; // decimal string in the invoice currency
  sourceQuote?: string; // words from the chat this item came from
  sac: string | null; // 6-digit services accounting code starting with 99; defaults to the profile's defaultSac
}

export interface InvoiceDraft {
  client: Client;
  currency: CurrencyCode;
  dueOn: string | null; // today + 14 days when the chat states no payment terms; null when the stated date is in the past
  items: LineItem[];
  note?: string;
  purposeCode: string | null; // suggestion from the fixed list, user can change
  purposeReason?: string; // one line on why that code was suggested
  includeLutNote: boolean; // adds the LUT declaration, the LUT ARN when saved and the place of supply to the invoice note
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
  clientCountry: string | null; // the name of the client's country, from the country code on the invoice's billing address, when there is one
  paidOn: string; // India date
  foreign: Money; // invoice amount
  fee: Money | null; // PayPal's fee; null until PayPal reports it
  net: Money | null; // amount after the fee, in the invoice currency; null until PayPal reports it
  inrReceived: number; // whole rupees
  inrSource: "paypal" | "estimate";
  rateUsed: number | null; // rupees per unit after PayPal's markup, when rupees are estimated
  rateDate: string | null; // date of the ECB rate used, when rupees are estimated
  purposeCode: string | null;
  sac: string | null; // services accounting code of the invoice's first item, kept in the invoice's private memo
  underLut: boolean; // the invoice note carries the LUT declaration
  transactionId: string | null; // PayPal's transaction ID, to match the FIRA: the capture or transaction PayPal reported, otherwise the invoice's own latest payment ID
}

// A payment recorded outside PayPal, a bank transfer: the same fields as a row, without the PayPal fee,
// net and transaction ID, with the bank's own proof.
export type ExportOutsideRow = Omit<ExportRegisterRow, "fee" | "net" | "transactionId"> & {
  bankReference: string | null; // the bank's FIRC or e-BRC number, once the freelancer has added it
};

export interface ExportRegister {
  month: string; // "YYYY-MM", in India time
  latestMonthWithPayments: string | null; // the newest month, up to the current one, with any visible paid invoice
  rows: ExportRegisterRow[]; // paid through PayPal
  outsideRows: ExportOutsideRow[]; // recorded as paid outside PayPal
  totalInr: number; // paypalFiraInr and bankInr together
  paypalFiraInr: number; // rupees paid through PayPal, the part that is on PayPal's FIRA
  bankInr: number; // rupees received by bank transfer
  totalsByCurrency: Money[]; // foreign invoice totals of both kinds of row, one per currency
  paypalInr: number; // part of paypalFiraInr that PayPal reported
  estimatedInr: number; // part of paypalFiraInr that is estimated
  missingPurposeCodes: number; // rows of either kind without a purpose code
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
  clientName: string; // the client's name as invoiced; see "Late-payer radar" for who counts as the same client
  invoicesConsidered: number; // the client's invoices that are paid or overdue
  lateCount: number;
  averageDaysLate: number;
  level: RiskLevel;
  suggestion: { kind: "early_payment_discount"; percent: number; withinDays: number } | null;
  reason: string; // one plain sentence, written by code from the numbers (no AI)
}

// src/types/reminder.ts
export type Tone = "gentle" | "firm" | "final";
// How a reminder reached the client: PayPal's standard reminder, or the freelancer's own email.
export type ReminderChannel = "paypal" | "email";
export type ReminderLanguage = "en" | "de" | "fr" | "es" | "nl" | "pt" | "hi";
export interface ReminderDraft {
  invoiceId: string;
  tone: Tone;
  suggestedTone: Tone; // by days late and reminders sent; a late payer's gentle becomes firm
  reason: string; // the facts behind suggestedTone, e.g. "Suggested firm: 8 days late, and late on 3 of 3 invoices."; the Today queue says the same
  language: ReminderLanguage; // the client's saved reminder language, or the one asked for
  subject: string;
  message: string;
  source: "ai" | "template"; // template when AI is unavailable, the daily cap is reached or the output failed a check
  pending: boolean; // true on GET /api/reminders when this is the template and the model has not been asked yet; POST /api/reminders/draft always answers false
  history: { tone: Tone; sentAt: string; channel: ReminderChannel }[]; // reminders sent for this invoice by either channel, oldest first
}

// src/types/activity.ts
export type ActivityKind = "paid" | "viewed" | "sent" | "overdue" | "reminder_sent" | "email_sent"; // reminder_sent: PayPal's reminder; email_sent: a message the freelancer sent from their own email
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
  prepareReminders: boolean; // default true: the daily run writes reminder drafts
  remindAfterDays: number; // default 3, whole days 1 to 60: an overdue invoice joins the Today queue at this many days late
  rateAlerts: RateAlert[]; // at most 3, default none
}
// Defaults: PayPal India's published fees for international commercial payments, from
// paypal.com/in/webapps/mpp/merchant-fees, checked on 29 Oct 2026.

// src/types/profile.ts
export interface Profile {
  yourName: string; // "" until set; printed on invoices and signed under reminders
  businessName: string; // "" until set; replaces PayPal's sandbox name on invoices
  gstin: string | null; // 15 characters, ^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$
  lutArn: string | null; // 15 letters and digits
  lutValidUntil: string | null; // YYYY-MM-DD
  defaultSac: string | null; // ^99[0-9]{4}$
  website: string | null; // http or https address
  signOff: string; // closing of reminders, default "Thank you"
}

// src/types/export.ts, year summary for a chartered accountant
export interface AnnualSummary {
  fy: string; // "2026-27": 1 April 2026 to 31 March 2027
  from: string; // first day of the financial year
  to: string; // last day of the financial year
  receivedPayPalInr: number; // rupees PayPal paid out, by the one rupee rule; invoices paid in the year
  receivedOutsideInr: number; // invoices recorded as paid outside PayPal, at the ECB rate of the payment date
  paypalFeesInr: number; // PayPal's fees (reported, otherwise estimated) at the ECB rate of the payment date
  conversionLossInr: number; // what PayPal's conversion rate took beyond the fees
  grossReceiptsInr: number; // the four figures above added up
  presumptiveIncomeInr: number; // section 44ADA: 50% of grossReceiptsInr
  presumptiveLimitInr: number; // 7,500,000: Dueline records no cash receipts, so the higher limit applies
  overLimit: boolean; // grossReceiptsInr is above presumptiveLimitInr
  invoiceCount: number; // invoices paid in the year
  clientCount: number; // clients behind them
}

// src/types/insights.ts, the dashboard widgets of Receivables
export interface ForecastBucket {
  label: string; // "Next 30 days", "31 to 60 days", "61 to 90 days"
  expectedInr: number; // whole rupees, weighted by each client's payment history
  bestCaseInr: number; // whole rupees, every invoice due in the window paid in full on its due date
  invoices: number; // unpaid invoices expected to arrive in the window
}
export interface Forecast {
  buckets: ForecastBucket[]; // always three, in order
  basis: string; // plain-language line for the screen
}
export interface FeesLost {
  financialYear: string; // "2026-27", the year to date
  feesInr: number; // PayPal's fees on payments received through PayPal
  conversionLossInr: number; // what PayPal's conversion rate took beyond the fees
  lostInr: number; // the two above added up
  receivedInr: number; // rupees PayPal paid out in the year
  lostPer100: number; // rupees lost per 100 rupees a client paid through PayPal, one decimal
}
export interface UpcomingDue {
  invoiceId: string;
  invoiceNumber: string;
  clientName: string;
  amount: Money;
  dueOn: string;
  payoutInr: number | null;
}
export interface LateClient {
  key: string; // client key, as in ClientSummary
  name: string;
  daysLate: number; // the client's most overdue unpaid invoice
  overdueInr: number; // estimated rupees on the client's overdue invoices
  riskLevel: RiskLevel | null;
  reason: string; // the radar's reason, with "Based on N invoices." when N is below 4
}
export interface RateLine {
  currency: CurrencyCode;
  rate: number; // rupees per unit, ECB, on onDate
  percentVsAverage: number | null; // one decimal; null when there is no 30-day average
}
export interface RatesWidget {
  onDate: string; // date of the rates
  source: "ecb" | "manual";
  hasAverage: boolean; // false when only today's rates were available
  lines: RateLine[];
}
// How long clients take, over the invoices paid in the last 12 months (by India date).
export interface PaySpeed {
  averageDays: number; // mean days from issue date to paid date, one decimal
  onTimePercent: number; // whole percent of those paid on or before the due date
  invoices: number; // how many invoices it rests on
}
export interface DashboardResponse {
  paySpeed: PaySpeed | null; // null when nothing was paid in the last 12 months
  forecast: Forecast;
  feesLost: FeesLost;
  upcomingDue: UpcomingDue[];
  lateClients: LateClient[];
  rates: RatesWidget;
  rateAlerts: TriggeredRateAlert[]; // the freelancer's alerts that today's rates trigger
}

// src/types/clients.ts
export interface ClientSummary {
  key: string; // URL-safe key from the client's name, the one grouping rule of the late-payer radar
  name: string;
  email: string; // of the client's newest invoice
  country: string | null; // country code, when any of the client's invoices has one
  paySpeed: PaySpeed | null;
  riskLevel: RiskLevel | null; // null when there is no history to judge
  riskReason: string; // the radar's reason, with "Based on N invoices." when N is below 4
  invoices: number; // all of the client's invoices that are not drafts or cancelled
  billedInr: number; // whole rupees: paid invoices at their payout, unpaid ones as estimated
  outstandingInr: number; // whole rupees on unpaid invoices, estimated after fees
  averageDaysLate: number;
  lastPaidOn: string | null;
}
export interface ClientDetail {
  client: ClientSummary;
  invoices: InvoiceSummary[]; // newest first
  risk: ClientRisk;
  notes: string; // "" until saved
  language: ReminderLanguage; // "en" until saved, kept beside the notes
}

// src/types/invoice-detail.ts
export type TimelineKind =
  | "created"
  | "sent"
  | "reminder"
  | "viewed"
  | "due" // the due date, shown once it is today or past
  | "overdue" // the day after the due date, for an invoice still unpaid (and not cancelled) then
  | "paid"
  | "cancelled";
export interface TimelineEvent {
  id: string;
  kind: TimelineKind;
  at: string; // ISO timestamp, or a YYYY-MM-DD date when PayPal gave no time
  tone?: Tone; // reminders
  channel?: ReminderChannel; // reminders
  via?: "paypal" | "outside_paypal"; // paid
}
export interface InvoiceItem {
  name: string;
  quantity: number;
  unitAmount: Money;
  sac: string | null;
}
export interface InvoiceDetails {
  clientKey: string;
  items: InvoiceItem[];
  note: string; // the invoice note, "" when there is none
  underLut: boolean;
  hiddenFromDemo: boolean; // the owner hid it from every screen and export (demo mode only)
  actions: { remind: boolean; recordPayment: boolean; cancel: boolean }; // valid for the status
}
export type PaymentMethod = "BANK_TRANSFER" | "WIRE_TRANSFER" | "OTHER";

// src/types/automation.ts, what the daily run prepares
export type RateDirection = "above" | "below";
export interface RateAlert {
  currency: CurrencyCode;
  direction: RateDirection;
  threshold: number; // rupees per unit, above 0 and below 1,000
}
export interface TriggeredRateAlert extends RateAlert {
  rate: number; // the rate that triggered it
}
export type QueueKind = "reminder" | "repeat";
export interface QueueItem {
  id: string; // "reminder.<invoiceId>" or "repeat.<repeatId>.<date>"
  kind: QueueKind;
  title: string; // e.g. "Retainer for Halden Coffee Co. is ready to send"
  detail: string;
  invoiceId: string | null; // set for a reminder: the Nudges card to open
  repeatId: string | null; // set for a repeat: New invoice is opened with ?repeat=<repeatId>
}
export interface DigestInvoice {
  invoiceId: string;
  invoiceNumber: string;
  clientName: string;
  amount: Money;
}
export interface DailyDigest {
  day: string; // the date the app is using
  paidSinceYesterday: DigestInvoice[]; // paid yesterday or today
  newlyOverdue: DigestInvoice[]; // overdue by 3 days or fewer
  dueSoon: DigestInvoice[]; // due within 3 days
  preparedDrafts: number; // items in the queue
  rateAlerts: TriggeredRateAlert[];
}
export interface RepeatItem {
  name: string;
  quantity: number;
  unitAmount: string;
  sac: string | null;
}
export interface RepeatSchedule {
  id: string; // the request ID that created it
  clientKey: string;
  clientName: string;
  clientEmail: string;
  currency: CurrencyCode;
  items: RepeatItem[];
  purposeCode: string | null;
  includeLutNote: boolean;
  dayOfMonth: number; // 1 to 28
  nextOn: string; // the next date a draft is prepared
  paused: boolean;
}
export interface LibraryItem {
  id: string;
  name: string;
  unitAmount: string;
  currency: CurrencyCode;
  sac: string | null;
}
export interface DailyRunResponse {
  ran: boolean; // false when today's preparation had already run
  digest: DailyDigest;
}

// src/types/api.ts
export interface ApiError {
  error: { code: string; message: string; debugId?: string };
}
```

## Endpoints

| Method and path                                     | Request body                                                                                              | Success response                                                                                                                                                                     | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/health`                                   | none                                                                                                      | `{ paypal: "connected" \| "error", ai: "ready" \| "missing_key", storage: "postgres" \| "memory" \| "error", mode: "sandbox", offline: boolean, today: string, demoClock: boolean }` | Used by the sidebar status line and uptime checks. `offline` is true in offline mode (see "Offline mode"), where `paypal` and `ai` read "connected" and "ready" because the simulated PayPal and the templates are always there. `today` is the date the app is using. The receivables screen re-reads it every 5 minutes, so the date stays right if the tab is left open past midnight                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `GET /api/invoices`                                 | none                                                                                                      | `{ invoices: InvoiceSummary[], totals: Totals }`                                                                                                                                     | Newest first. Front end polls every 10 s on the receivables page                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `POST /api/invoices/extract`                        | `{ chat: string }` (1 to 6,000 chars)                                                                     | `{ draft: InvoiceDraft, warnings: string[], risk: ClientRisk \| null, masked: { emails: number, phones: number } }`                                                                  | Emails and phone numbers are masked before the AI call and restored by code; `masked` counts them. Every field is re-checked in code and `warnings` names anything not found or corrected, e.g. "No payment terms in the chat; due date set to 14 days from today. Change it if needed.". `risk` is the late-payer radar's reading of the draft's client (`GET /api/clients/risk`), or `null` when the draft has no client email or the reading could not be made. 10 extractions an hour per address (`429 rate_limited`) and 400 model calls a day for the whole app (`503 ai_unavailable`); an identical chat on the same day is answered from a 24-hour cache that counts towards neither. `422 extraction_failed` when no item is usable                                                                                                                                                                                                                                                                                                  |
| `POST /api/payout-estimate`                         | `{ amount: Money }`                                                                                       | `PayoutEstimate`                                                                                                                                                                     | Pure calculation from settings and the day's market rate, no AI                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `POST /api/invoices`                                | `{ draft: InvoiceDraft, requestId: string, discount?: { percent: number, withinDays: number } }`          | `{ invoice: InvoiceSummary, sent: boolean }`                                                                                                                                         | Creates the draft, then sends it (the send call carries no subject or note: PayPal ignores them and shows the invoice itself, with its note, terms and LUT line). The server checks and recomputes everything, and in demo mode refuses a recipient that is not a PayPal sandbox buyer. `dueOn` must be today or later (`400 invalid_request`). `discount` is PayPal's own invoice discount (`percent` 1 to 20, `withinDays` 3 to 30), and the due date becomes the earlier of `dueOn` and `withinDays` after the invoice date. A repeated `requestId` returns the stored result. A request still in progress is `409 duplicate_request`: "This invoice is still being created. Check Receivables before trying again." If sending fails, returns 200 with `sent: false` and the draft, so the user can retry. If PayPal rejects the create, nothing was created, the `requestId` is released and the answer is `502 paypal_error`. If PayPal does not answer the create in time, the result is unknown and the answer is `504 paypal_timeout` |
| `POST /api/invoices/{id}/send`                      | `{ requestId: string }`                                                                                   | `{ invoice: InvoiceSummary, sent: true }`                                                                                                                                            | Retries sending an existing draft (with no subject or note, as above). An invoice PayPal already shows as sent is returned without a second send. `404 not_found` for an unknown id                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `GET /api/purpose-codes`                            | none                                                                                                      | `{ codes: PurposeCode[] }`                                                                                                                                                           | Fixed list from `src/lib/export/purpose-codes.ts`. It reads nothing but that list, so it is prerendered at build time and is the one data `GET` that does not call `connection()`; every other `GET` waits for a request                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `GET /api/demo/recipient`                           | none                                                                                                      | `{ email: string }`                                                                                                                                                                  | The sandbox buyer's address from `SANDBOX_BUYER_EMAIL`, for the review screen's "Send to the demo buyer" button. `404 not_found` unless `DEMO_MODE` is on and the address is set                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `GET /api/export-register?month=YYYY-MM`            | none                                                                                                      | `ExportRegister`                                                                                                                                                                     | Invoices paid in that month in India time (the date of PayPal's payment timestamp, not PayPal's own `payment_date`), sorted by paid date then invoice number. A partly paid invoice is left out until it is paid in full. An invoice paid through PayPal is a row. An invoice marked as paid outside PayPal has no PayPal payment or FIRA line, so it is an `outsideRows` entry (a bank transfer) with no fee or transaction ID and the `bankReference` saved for it; `paypalFiraInr` and `bankInr` report the two kinds of rupees and `totalInr` both. Only invoices the demo shows are listed (see "Demo story"). `latestMonthWithPayments` is the newest month, up to the current one, that has any such paid invoice. Rupees are the same figure as `payoutInr` on the invoice: PayPal's `netInr` when PayPal reports a conversion, otherwise PayPal's net at the ECB rate of the payment date less the settings' markup (`inrSource: "estimate"`). `400 invalid_request` for a month after the current one                                |
| `GET /api/export-register?month=YYYY-MM&format=csv` | none                                                                                                      | CSV file (`text/csv; charset=utf-8`, attachment `dueline-export-YYYY-MM.csv`)                                                                                                        | Both kinds of row, for a chartered accountant, sorted by paid date. A final `Proof` column says `PayPal FIRA`, `Bank FIRC/e-BRC <reference>` or `Bank, reference missing`; a bank row leaves the fee, net and transaction cells empty. UTF-8 with a byte order mark, quoted as RFC 4180. A text cell starting with `=`, `+`, `-`, `@`, tab or carriage return gets a leading `'` so a spreadsheet does not run it as a formula                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `GET /api/profile` / `PUT /api/profile`             | PUT: `Profile`                                                                                            | `Profile`                                                                                                                                                                            | Stored in Postgres (memory when no database is configured). An empty profile is `yourName: ""`, `businessName: ""`, every optional field `null` and `signOff: "Thank you"`. PUT checks the GSTIN, SAC (`^99[0-9]{4}$`) and LUT ARN (15 letters and digits) formats and a `website` that starts with http or https, and refuses a `yourName` or `signOff` that holds a link or email address. See "Business profile"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `GET /api/exports/gstr1?month=YYYY-MM&format=csv`   | none                                                                                                      | CSV file (attachment `dueline-gstr1-YYYY-MM.csv`)                                                                                                                                    | The export rows of GSTR-1's offline tool for invoices **issued** in the month. See "GSTR-1 export". `400 invalid_request` for a month after the current one                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `GET /api/exports/annual?fy=2026-27`                | none                                                                                                      | `AnnualSummary`                                                                                                                                                                      | Year totals for a chartered accountant. With `format=csv` the same figures come as a CSV file (attachment `dueline-year-summary-2026-27.csv`). `400 invalid_request` for a malformed year or one that has not started. See "Annual summary"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `PUT /api/export-register/bank-reference`           | `{ invoiceId: string, reference: string }` (reference 0 to 40 characters of letters, digits, `/` and `-`) | `{ invoiceId: string, reference: string \| null }`                                                                                                                                   | Saves the bank's FIRC or e-BRC number for an invoice recorded as paid outside PayPal; an empty `reference` clears it (answer `null`). `400 invalid_request` for other characters or more than 40, `404 not_found` for an unknown invoice, `409 invalid_state` for an invoice that was not recorded as paid outside PayPal                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `POST /api/demo/hidden-invoices`                    | `{ invoiceId: string, hidden: boolean }`                                                                  | `{ invoiceId: string, hidden: boolean }`                                                                                                                                             | Demo mode only (`404 not_found` otherwise), behind the demo password. Hides an invoice from every screen and export, or shows it again; the invoice stays in PayPal and keeps its own page, which carries `hiddenFromDemo` and a "Hide from the demo" button. `404 not_found` for an unknown invoice                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `POST /api/demo/reset`                              | none                                                                                                      | `{ cancelled: number, deleted: number, created: number, skipped: number, failed: number, kept: number }`                                                                             | Demo mode only (`404 not_found` otherwise), behind the demo password. Starts a new story generation and seeds the whole story dated from today (see "Demo story"). Cancels every sent or unpaid invoice (sending no emails), the open story invoices of older generations included, and deletes every draft, except any non-story invoice created in the last 30 minutes (by PayPal's `create_time`), which is left alone and counted in `kept`; then creates the story and records its history as paid outside PayPal. Paid, marked-as-paid and partly paid invoices are never touched. Once every 10 minutes for the whole app (`429 rate_limited`: "The demo was reset a few minutes ago. Try again in N minutes.")                                                                                                                                                                                                                                                                                                                         |
| `POST /api/demo/session`                            | `{ password: string }` (1 to 200 chars)                                                                   | `204` and sets the `dueline_demo` cookie                                                                                                                                             | Public. `401 unauthorized` for a wrong password; `429 rate_limited` after 10 attempts in 15 minutes from one address                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `DELETE /api/demo/session`                          | none                                                                                                      | `204` and clears the cookie                                                                                                                                                          | Public                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `GET /api/clients/risk?email=&name=`                | none                                                                                                      | `ClientRisk`                                                                                                                                                                         | `name` is optional. The client's invoices are those whose business name matches after trimming, collapsing spaces and ignoring case, or, outside demo mode, whose recipient email matches; in demo mode (every client shares the sandbox buyer's email) only the name counts. Without `name` the email decides. Used on the review screen and in the invoice panel. See "Late-payer radar"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `GET /api/reminders`                                | none                                                                                                      | `{ drafts: ReminderDraft[], remindersLeftToday: number }`                                                                                                                            | Answers at once, without waiting for the model. One draft per overdue invoice (sent, unpaid or partly paid), in its suggested tone and the client's reminder language, most days late first, at most 10. A draft the model wrote earlier (cached for 24 hours, which the daily run fills) comes back as it is with `pending: false`; otherwise the template comes back with `pending: true`, and the screen asks `POST /api/reminders/draft` for a better one. `remindersLeftToday` is PayPal's two a day less the reminders in Dueline's log since India midnight, and 0 for the rest of the India day once PayPal has answered 429. See "Reminders"                                                                                                                                                                                                                                                                                                                                                                                          |
| `POST /api/reminders/draft`                         | `{ invoiceId: string, tone: Tone, language?: ReminderLanguage }`                                          | `ReminderDraft`                                                                                                                                                                      | Writes one overdue invoice in a tone, calling the model when no cached draft exists, and always answers `pending: false`. `language` overrides the client's saved language for this draft only. `404 not_found` for an unknown invoice, `400 invalid_request` when it is paid or not overdue. 20 drafts an hour per address (`429 rate_limited`). See "Reminders"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `POST /api/reminders/send`                          | `{ invoiceId: string, tone: Tone, channel: ReminderChannel, requestId: string }`                          | `{ sentAt: string }`                                                                                                                                                                 | With `channel: "paypal"`, asks PayPal to email its standard reminder, which carries the invoice and its Pay now button; no subject or note is sent, because PayPal ignores them. With `channel: "email"`, only records that the freelancer sent their own drafted message from their own email (nothing is sent from here and the words never reach the server). A repeated `requestId` with the same body returns the stored `sentAt`. See "Reminders"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `GET /api/dashboard`                                | none                                                                                                      | `DashboardResponse`                                                                                                                                                                  | Every widget of Receivables beyond the totals and the invoice list. See "Money views"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `GET /api/clients`                                  | none                                                                                                      | `{ clients: ClientSummary[] }`                                                                                                                                                       | One row per client, most outstanding first. Grouping is the late-payer radar's. See "Money views"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `GET /api/clients/by-key/{key}`                     | none                                                                                                      | `ClientDetail`                                                                                                                                                                       | `404 not_found` for a key no invoice maps to                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `PUT /api/clients/by-key/{key}/notes`               | `{ notes: string }` (0 to 1,000 chars)                                                                    | `{ notes: string }`                                                                                                                                                                  | Private notes, stored in Postgres (memory without a database). `404 not_found` for an unknown key                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `PUT /api/clients/by-key/{key}/language`            | `{ language: ReminderLanguage }`                                                                          | `{ language: ReminderLanguage }`                                                                                                                                                     | The language new reminder drafts for this client are written in, kept beside the client's notes. `404 not_found` for an unknown key. See "Reminder languages"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `GET /api/cron/daily`                               | none                                                                                                      | `DailyRunResponse`                                                                                                                                                                   | Called once a day by Vercel Cron with `Authorization: Bearer <CRON_SECRET>`, not with the demo cookie. `401 unauthorized` for a missing or wrong secret, or when `CRON_SECRET` is not set. Once per India day: a repeat answers `ran: false` with the stored digest. Writes drafts and queue entries only; nothing is sent to PayPal or a client. See "Daily preparation"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `POST /api/demo/prepare`                            | none                                                                                                      | `DailyRunResponse`                                                                                                                                                                   | The same preparation as the cron job, for the "Run today's preparation now" button on Demo tools. Demo mode only (`404 not_found` otherwise), behind the demo cookie, with the same once-a-day rule                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `GET /api/queue`                                    | none                                                                                                      | `{ items: QueueItem[] }`                                                                                                                                                             | Every item that has not been removed, in the order it was prepared                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `POST /api/queue/{id}/dismiss`                      | none                                                                                                      | `{ dismissed: true }`                                                                                                                                                                | Removes the item. A reminder item returns with the next daily run if the invoice is still overdue; a retainer item does not. `404 not_found` for an unknown item                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `GET /api/digest`                                   | none                                                                                                      | `DailyDigest`                                                                                                                                                                        | What the morning run recorded for today, or the same figures worked out now when it has not run. See "Digest and rate alerts"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `GET /api/rate-alerts`                              | none                                                                                                      | `{ alerts: TriggeredRateAlert[] }`                                                                                                                                                   | The alerts in Settings that the rates in use trigger now. A rate exactly at the threshold does not trigger it                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `GET /api/repeats?client=<key>`                     | none                                                                                                      | `{ repeats: RepeatSchedule[] }`                                                                                                                                                      | Every monthly repeat, or the ones of one client. See "Monthly repeats"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `POST /api/repeats`                                 | `{ invoiceId: string, dayOfMonth: number, requestId: string }`                                            | `RepeatSchedule`                                                                                                                                                                     | Saves a schedule from an invoice: its client, items, currency, purpose code, SAC and LUT are read from PayPal, not taken from the request. `dayOfMonth` is a whole number from 1 to 28; the first date is the next one after today. A repeated `requestId` returns the saved schedule. `400 invalid_request` for an invoice with no items                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `PATCH /api/repeats/{id}`                           | `{ paused: boolean }`                                                                                     | `RepeatSchedule`                                                                                                                                                                     | Pauses or resumes a schedule. Resuming moves a date that has passed on to the next one, so a resumed schedule does not fire at once. `404 not_found` for an unknown ID                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `DELETE /api/repeats/{id}`                          | none                                                                                                      | `204`                                                                                                                                                                                | Deletes a schedule. Drafts it already prepared stay in the queue. `404 not_found` for an unknown ID                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `GET /api/items`                                    | none                                                                                                      | `{ items: LibraryItem[] }`                                                                                                                                                           | The item library, by name. See "Item library"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `POST /api/items`                                   | `{ id?: string, name: string, unitAmount: string, currency: CurrencyCode, sac: string \| null }`          | `LibraryItem`                                                                                                                                                                        | Saves an item. With an `id` it changes that item (a rename or a new price, `404 not_found` if it is gone). Without one, an item with the same name (ignoring case) and currency is updated instead of repeated. `name` is 1 to 200 characters, `unitAmount` a positive amount with at most 2 decimals, `sac` six digits starting with 99. The library holds 50 items (`400 invalid_request` beyond that)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `DELETE /api/items/{id}`                            | none                                                                                                      | `204`                                                                                                                                                                                | Deletes an item. `404 not_found` for an unknown ID                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `GET /api/invoices/{id}`                            | none                                                                                                      | `{ invoice: InvoiceSummary, timeline: TimelineEvent[], reminders: { tone: Tone, sentAt: string, channel: ReminderChannel }[], details: InvoiceDetails }`                             | Newest timeline event first. Works for cancelled invoices too. `404 not_found` for an unknown id                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `POST /api/invoices/{id}/cancel`                    | `{ requestId: string, notifyClient?: boolean }`                                                           | `{ cancelled: true, notified: boolean }`                                                                                                                                             | Cancels a sent, unpaid invoice in PayPal. The client is emailed only when `notifyClient` is true, and then the demo guard applies. `409 invalid_state` for a paid, cancelled or unsent invoice. A repeated `requestId` returns the stored result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `POST /api/invoices/{id}/record-payment`            | `{ requestId: string, method: PaymentMethod, paidOn: string, note?: string }`                             | `{ recorded: true, paidOn: string }`                                                                                                                                                 | Records a payment made outside PayPal (type `EXTERNAL`). `paidOn` must not be in the future or before the invoice date (`400 invalid_request`); `note` is up to 200 characters. `409 invalid_state` for a paid, cancelled or unsent invoice. The invoice then counts as paid outside PayPal                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `GET /api/activity`                                 | none                                                                                                      | `{ events: ActivityEvent[] }`                                                                                                                                                        | Latest 20, newest first. Fed by webhooks and by the demo seed. In demo mode only events of invoices the demo shows are listed (20 of them, not 20 rows filtered), and a story invoice's `sent` and `paid` events carry the story's dates (09:00 India time), also for rows stored with the real time                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `GET /api/settings` / `PUT /api/settings`           | PUT: `Settings`                                                                                           | `Settings`                                                                                                                                                                           | Stored in Postgres (memory when no database is configured)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `POST /api/webhooks/paypal`                         | PayPal event, raw body up to 100 KB                                                                       | `204`                                                                                                                                                                                | Back end only, public. Signature verified by PayPal's postback, event ID de-duplicated. An invoice event re-reads the invoice from PayPal; paid and sent events record activity. `400 invalid_webhook` when headers are missing or verification fails; `500` when processing fails, so PayPal retries                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |

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
| 409    | `invalid_state`         | The invoice's status does not allow the action, e.g. cancelling a paid invoice                         |
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

- Every `/api` route needs the cookie, except `GET /api/health`, `POST /api/webhooks/paypal`,
  `GET /api/cron/daily` and `/api/demo/session`. Without it the route answers `401 unauthorized`
  with "Enter the demo password to continue." The cron route is left out because Vercel Cron cannot
  send the cookie or follow a redirect; it checks `CRON_SECRET` itself.
- The screens `/receivables`, `/clients`, `/invoices`, `/nudges`, `/export`, `/profile`, `/settings` and `/demo-tools` redirect to
  `/demo?next=<path>`. The landing page stays public.
- Access is on when `DEMO_PASSWORD` is set. In production `DEMO_PASSWORD` and `SESSION_SECRET` are
  both required: without them protected routes answer `500 config_error` and protected screens show
  "This deployment is not configured". In development and tests an unset `DEMO_PASSWORD` leaves
  access open.

## Business profile

One profile for the whole app. Every invoice and reminder uses it.

- **Invoice header.** `invoicer.business_name` is `businessName`, `invoicer.name` is `yourName` split
  at its last space into given name and surname, `invoicer.tax_id` is the GSTIN and `invoicer.website`
  the website; each only when set. This replaces PayPal's sandbox name where the API allows it.
- **Items.** An item with a SAC has the description `SAC 998314`. The first item's SAC is also kept in
  the private memo as `sac:998314`, next to `purpose:`, so the export register can read it.
- **LUT.** When `includeLutNote` is true the invoice note carries `SUPPLY MEANT FOR EXPORT UNDER LETTER
OF UNDERTAKING WITHOUT PAYMENT OF INTEGRATED TAX` (on one line), then `LUT ARN: <ARN>` when the
  profile has one, then `Place of supply: outside India`. The older line "Export of services under
  LUT, without payment of IGST" on invoices made before this change still counts as under LUT.
- **Reminders.** Every reminder, from the template or the model, ends with `signOff`, then `yourName`
  on the next line, then `businessName` on the line after when it is set and not the same as the
  name. With neither only the sign-off is written; a name is never invented.
- **Draft items.** `POST /api/invoices/extract` gives every item the profile's `defaultSac`.
- **Client country.** The extraction asks the model for `clientCountry` (a country code) and the
  `countryQuote` it came from; code keeps the code only when it is on the list and the words are in
  the chat, and never guesses from the currency. The review screen offers a Country select, and
  creating the invoice sends only `country_code` as the recipient's `billing_info.address`. The
  summary's `client.country` is read back from it.

## GSTR-1 export

Columns, in the order of the offline tool's `exp` sheet: Export Type, Invoice Number, Invoice date,
Invoice Value, Port Code, Shipping Bill Number, Shipping Bill Date, Rate, Taxable Value, Cess Amount.

- One row per invoice **issued** in the month (GST follows the invoice date, not the payment date),
  whatever its payment state. Drafts and cancelled invoices are left out.
- Export Type is `WOPAY` with Rate 0 for an invoice under LUT, and `WPAY` with Rate 18 otherwise. Port
  code, shipping bill number and date, and cess are blank.
- Invoice Value and Taxable Value are the invoice amount in rupees, to the paisa, at the ECB rate of
  the invoice date (the last rate the ECB published before it). GST law uses the RBI reference rate,
  so a note under the rows says to confirm with a CA.
- Dates are `dd-mmm-yyyy`. Text cells are protected against spreadsheet formulas like the register's.

## Annual summary

For the financial year `fy` (1 April to 31 March, for example `2026-27`), over the invoices paid in it
by India date, with the register's rupee rule. `grossReceiptsInr` adds rupees received through
PayPal, rupees recorded outside PayPal, PayPal's fees and the conversion loss. Section 44ADA deems 50%
of it to be income. The limit is 75 lakh because Dueline records no cash receipts. The screen and the
CSV say "Estimate. Confirm with your CA." and warn when `overLimit` is true.

## Late-payer radar

Invoices belong to the same client when the normalised business name matches **or**, outside demo
mode, the email matches. In demo mode every invoice goes to the same sandbox buyer, so the name
alone decides. A pasted chat for "Brightwell Labs" with a new email therefore still finds
Brightwell's history. The names are compared after trimming, collapsing spaces and ignoring case. Only the client's invoices that are **paid or overdue** are considered; an
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
  late, 14 days on average." The screens add "Based on N invoices." when `invoicesConsidered` is
  below 4.

## Reminders

- **Tones.** `gentle`, `firm` and `final`. The suggested tone is `gentle` for 1 to 7 days late with
  no reminder sent, `firm` for 8 to 30 days late or one reminder sent, and `final` only after two or
  more reminders were sent or when the invoice is more than 30 days late. A client whose level is
  `late_payer` is chased one step firmer at the start: gentle becomes firm, but lateness alone never
  makes a late payer's message final; `watch` keeps the tone. `ReminderDraft.reason` names the facts,
  for example "Suggested firm: 8 days late, and late on 3 of 3 invoices." or "Suggested final: two
  reminders already sent."; the Nudges card and the Today queue show the same text.
- **Drafting.** Gemini writes the subject and message from the invoice's facts, and code checks the
  result: subject 5 to 120 characters, message 20 to 900, the invoice number present, any money
  amount equal to the invoice amount, and no links or email addresses. The client's business name and the invoice's work description are removed first, so a client called "Acme.io" is not a link. Otherwise, and when AI is
  unavailable or the app's daily allowance is used up, a template written in code is used.
  `source` says which. Drafts are cached for 24 hours per invoice, tone, language, days late and reminders sent.
- **Reads like a person.** The model is asked for a greeting line, then two or three short paragraphs
  separated by a blank line, with at most one thank you and no sign-off. A pure normaliser runs on
  every message, from the model, a template or the cache: the greeting is on its own line, a block
  of more than two sentences is split into paragraphs of one or two, no blank line repeats and
  trailing spaces go. A tone check then rejects a draft whose words contradict its tone: a firm or
  final message with "friendly", "gentle", "gently", "just a quick", "no rush" or "whenever you can",
  a gentle or firm one with "final" or "last reminder", and the equivalent words of each reminder
  language. A rejected draft (also a cached one) is replaced by the template for that tone, and the
  log names the phrase, never anything from the invoice. The final tone's guidance says "last
  reminder" only once two reminders have been sent, and the final template and the tone check follow the same rule: a final message reached by being more than 30 days late with fewer reminders asks for payment within 3 days or a date, in every language, without saying "final" or "last". Line breaks are kept (as CRLF in the `mailto:` link). PayPal ignores the words of a reminder it sends (see "Two channels").
- **Fast first answer.** `GET /api/reminders` never calls the model. It returns the cached model
  draft when there is one and otherwise the template with `pending: true`. The Nudges screen then asks
  `POST /api/reminders/draft` for each pending card, one card at a time and two requests in flight at
  most, shows "Improving the draft…" on those cards, and replaces the text only if the user has not
  edited it; if they have, their text is kept and the card says so. Sending stays possible on a
  template draft.
- **Limits.** Drafts that call the model count towards the app's 400 calls a day, and
  `POST /api/reminders/draft` allows 20 an hour per address. PayPal allows two reminders a day per
  caller, and Dueline sends at most one per invoice per India day.
- **Two channels.** PayPal's Invoicing v2 schema says a user-provided `subject` or `note` on the
  remind and send calls "will not be honored" and is replaced with a system-defined value, so the
  drafted message never reaches the client through PayPal. Nudges offers two honest actions per card.
  "Send PayPal reminder" (`channel: "paypal"`) has PayPal email its standard reminder with a Pay now
  button; the card says PayPal writes the wording. "Send my message" opens the freelancer's own
  email with the drafted subject and message, addressed to the client, with the invoice's PayPal pay
  link added by code as the last paragraph ("Pay here: <link>"): "Open in email app" (a `mailto:`
  link, line breaks as `%0D%0A`), "Open in Gmail" (`mail.google.com/mail/?view=cm&fs=1` with `to`,
  `su` and `body`), and "Copy message". When the encoded `mailto:` link would pass 1,800
  characters only Gmail and Copy are offered, and the card says why. The pay link is the only link a
  message may hold: the link check still rejects any other link a model writes, and the pay link is
  added after it. Opening or copying records nothing; an "I sent it" button, shown after either,
  sends `channel: "email"`. In demo mode the client's address is the sandbox buyer and the card says
  so. Both approve-and-send paths need a click, and using one leaves the other available that day; nothing is sent automatically, and the Today queue's
  "Review and send" opens the same card.
- **Sending.** The invoice must be sent and unpaid or partly paid, and overdue. Otherwise
  `400 invalid_request`: "This invoice is already paid." or "This invoice is not overdue.". In demo
  mode a recipient that is not a sandbox buyer is `403 recipient_not_allowed`, before PayPal is
  asked to send the reminder (this applies to the `paypal` channel only). One reminder per channel per invoice per India day: a second `paypal` one is `429 rate_limited`: "A PayPal
  reminder was already sent today for this invoice.", a second `email` one "A message from your email
  was already recorded today for this invoice." The channels are counted apart, so after one the other
  is still allowed, and the Nudges card closes for the day only when both have been used. When PayPal answers 429 the request ID is
  released and the answer is `429 rate_limited`: "PayPal allows two reminders a day for this account.
  Try again tomorrow.". The same answer comes, without calling PayPal, once two PayPal reminders are
  logged for the India day (messages sent from the freelancer's own email do not count) or PayPal has already answered 429 that day. A repeated `requestId` with the same body returns the stored `sentAt`
  without calling PayPal; with another body it is `409 duplicate_request`.
- **Activity.** A PayPal reminder records an `ActivityEvent` of kind `reminder_sent` ("Reminder sent
  through PayPal") and a recorded email one of kind `email_sent` ("Message sent from your email"),
  both with the id
  `reminder:<requestId>`, and is kept in the invoice's reminder history.

## Money views

- **Forecast.** Each unpaid invoice is expected on its due date plus its client's average days late
  (none for a `reliable` client). An overdue invoice is expected today plus the days the client is
  usually late beyond the days already late, and at least 3 days from today. Its rupees (`payoutInr`)
  are weighted by risk: `reliable` 0.95, `watch` 0.85, `late_payer` 0.7, and 0.5 for any invoice more
  than 30 days overdue. A client with no history counts as `watch` with no delay. Buckets are the
  next 30, 31 to 60 and 61 to 90 days; later invoices are left out. The best case counts the full
  rupees of every invoice by its due date (today when overdue). The screen says "Weighted by each
  client's payment history. Best case assumes everyone pays on time."
- **Fees lost.** The current Indian financial year to date, from the annual summary: PayPal's fees
  plus the conversion loss, over invoices paid through PayPal. Fees and rupees are PayPal's where it
  reported them and estimated otherwise, and the widget says so. Payments recorded outside PayPal pay
  no fee and are not counted. `lostPer100` is the loss over the market value of those payments.
- **Upcoming due.** Unpaid invoices due from today to 14 days ahead, soonest first.
- **Late clients.** The three clients with the most days late on an unpaid invoice.
- **Rates.** Today's ECB rate of each currency against the average of the last 30 days from
  Frankfurter, fetched once a day and kept in the store. When the history cannot be read, or the
  settings use manual rates, only today's rates are shown and `hasAverage` is false.
- **Clients.** A client is a group of invoices under the late-payer radar's rule. The `key` is the
  client's name in lower case with runs of other characters turned into `-`. The client routes
  and the screen sit under `by-key` (`/api/clients/by-key/{key}`, `/clients/by-key/{key}`), so a client
  called "risk" cannot collide with `GET /api/clients/risk`.
- **Invoice page.** The timeline comes from PayPal's invoice metadata, Dueline's reminder log and the
  activity feed. Paid through PayPal and paid outside PayPal are told apart. Every invoice gets a
  `due` event on its due date once that date is today or past, and an `overdue` event the day after
  when it was still unpaid then. A story invoice's `created` and `sent` use its issue date at 09:00
  India time, like Activity.
- **Pay speed.** `PaySpeed` is the mean days from issue date to paid date over the visible invoices
  paid in the last 12 months, and the share paid on or before the due date. It is on the dashboard
  data and on each client; null when nothing was paid.
- **Cancel and record payment.** Each carries a `requestId` claimed like every other write, and clears
  the invoice caches. Neither can be undone from Dueline. Cancel does not email the client unless
  `notifyClient` is set.
- **Layout.** Which widgets Receivables shows, and in what order, is kept in the browser
  (`localStorage`), not on the server.

## Reminder languages

A client's reminder language is one of English, German, French, Spanish, Dutch, Portuguese and Hindi
(`en`, `de`, `fr`, `es`, `nl`, `pt`, `hi`), set on the client page and kept beside the client's notes.
English is the default.

- Drafts, from the model or from the templates (which exist for every language and tone), are written
  in that language. The sign-off follows it when the profile's sign-off is the default "Thank you";
  one the freelancer wrote is kept.
- The same checks apply, with money read the way the language writes it: the invoice number is
  present, every amount equals the invoice amount in that language's number format ("12.500,50 USD" in
  German, "12 500,50 USD" in French, "12,34,567.00 USD" in Hindi), and there are no links or email
  addresses. A draft that fails them is replaced by the template.
- A card in another language says "Written in German." and offers "Write in English", and back.
  The choice is for that draft only: `POST /api/reminders/draft` takes a `language` that overrides the
  saved one without saving it.

## Daily preparation

`GET /api/cron/daily` runs once a day (Vercel Cron, `30 0 * * *`, which is 06:00 India time; the
Hobby plan allows one run a day and may start it at any minute of that hour). It is claimed under the
request ID `daily-run:<India day>`, so a repeat, a retry by the cron service or the demo button finds the
day done and answers `ran: false`. A run that fails releases the claim and can be run again. It:

1. reloads the invoices from PayPal;
2. when `prepareReminders` is on, writes and caches a reminder draft for every overdue invoice (at
   most 10, two model calls at a time, templates once the app's daily allowance is used up), and
   replaces the queue's reminder items with one for each overdue invoice that is at least
   `remindAfterDays` days late and has not been reminded today (with `prepareReminders` off it
   clears them);
3. turns each monthly repeat that has come due into a queue item (see "Monthly repeats");
4. answers with the digest (see "Digest and rate alerts"), which is worked out then and not stored.

It never creates, sends or reminds anything in PayPal. The Today list on Nudges shows the queue.
Items stay until the freelancer acts on them or dismisses them, not only for the day they were
prepared. "Review and send" opens the Nudges card or New invoice. A reminder item is refreshed by each
daily run, so an invoice that was paid or is no longer overdue drops out; "Dismiss for today" removes
it and the next run brings it back if the invoice is still overdue. A reminder item is also dropped
and deleted whenever the queue is read and its invoice is not shown, is paid or is no longer overdue,
and a demo reset or re-seed clears the reminder items. A retainer item stays until its
draft is sent or dismissed, and "Dismiss" removes it for good because its schedule has already moved
on.

## Monthly repeats

"Repeat monthly" on an invoice page saves a schedule: the client, items, currency, purpose code, SAC
and LUT choice of that invoice, a day of the month from 1 to 28, and the next date. On that date the
daily run adds a queue item "Retainer for Halden Coffee Co. is ready to send". It links to
`/invoices/new?repeat=<id>`, which opens the review step filled in, with the due date left to choose;
the freelancer sends it with the usual flow. The next date moves on only after the queue item exists,
so an interrupted run is finished by the next one without a second item. A schedule that fell behind
makes one item, not one for every month it missed. The client page lists the client's repeats with
Pause, Resume and Delete.

## Item library

On New invoice, "Save to library" on an item row stores its name, unit price, currency and SAC, and
"Add from library" searches the saved items in the invoice's currency and adds one. A lone empty row is
replaced by the item. Profile lists the items and lets the freelancer rename or delete them.

## Digest and rate alerts

- **Digest.** The "This morning" widget at the top of Receivables shows what has happened since
  yesterday: invoices paid yesterday or today, invoices overdue by 3 days or fewer, invoices due in the
  next 3 days, the number of drafts prepared, and triggered rate alerts. The figures are worked out
  each time it is read, from the shown invoices and the queue, so a cancelled or paid invoice is
  never listed. Like every
  widget it can be hidden and moved with Customise; the layout lives in the browser.
- **Rate alerts.** Settings holds up to three alerts such as "USD above ₹96" or "EUR below ₹100". An
  alert is triggered while the rate in use (the ECB's, or the freelancer's own when set by hand) is
  beyond its threshold. Triggered alerts are marked on the Rates widget, counted by a badge on "Fees and
  rates" in the sidebar, and listed in the digest.
- **Browser notifications.** "Notify me in this browser" asks the browser for permission only when the
  switch is turned on, and the choice is kept in that browser. While Dueline is open it checks once a
  minute and shows a notification for an alert that has just been triggered or a payment that has just
  arrived. There are no emails, no WhatsApp and no push service.

## Look and feel

- **Theme.** Light, Dark and "Match my system", chosen with the switch in the sidebar and kept in the
  browser. The colours are tokens in `src/app/globals.css` for both themes; the AG Grid theme and the
  charts read them. Text tokens keep 4.5:1 contrast on their surfaces in both themes (a test checks
  it).
- **Command palette.** Ctrl+K (Cmd+K on a Mac), or the Search button, opens a dialog to go to any page,
  open a client or an invoice by typing, start "New invoice", "Draft a reminder for …" or "Toggle
  theme". The arrow keys move through the results, Enter chooses and Esc closes. "?" lists the
  shortcuts.
- **Phones.** Below 768 px the sidebar is a bar along the top with a menu button, widgets stack,
  Receivables, Clients and the export register are lists of cards, the due line scrolls sideways with
  its client labels pinned, and buttons and fields are at least 44 px tall.
- **Installable.** `manifest.webmanifest` (name Dueline, navy theme colour, icons made from
  `public/icon.svg`) and an apple touch icon let a phone or browser install it. There is no service
  worker, so an installed copy still needs a connection.

## Offline mode

`DUELINE_OFFLINE=true` runs the app with no PayPal account, Gemini key or database, for trying it
locally (`npm run dev:offline`) and for the end-to-end tests. Every endpoint above behaves as
described; what changes is what stands behind them.

- **PayPal** is a simulation that keeps invoices in memory and answers the Invoicing, Payments,
  Transaction Search and webhook-verification calls Dueline makes. On first use it holds the first generation of the demo
  story (with its countries, its second Halden Coffee Co. invoice, its activity rows and its one past
  reminder, seeded like the real demo) and four invoices paid through PayPal, with PayPal-style fee and rupee figures. A webhook is
  accepted when its `paypal-transmission-sig` is `offline-signature`.
- **Drafting** from a chat is done by a small parser in code, and reminders are the templates
  (`source: "template"`). No model is called, so the daily allowance is not used. The parser's
  answer goes through the same checks as a model's.
- **Rates** are the ones saved in settings (by default the ECB's of 29 Oct 2026), reported with
  source `manual`. The ECB is not asked. The screens that show the source (Fees and rates, the
  rates widget and the payout estimate) read `offline` from `GET /api/health` and call these rates
  "Saved rates (offline demo)", because nobody typed them in.
- **Storage** is in memory, whatever `DATABASE_URL` says. PayPal, Gemini and database settings in the
  environment are ignored, `DEMO_MODE` is on, `DEMO_PASSWORD` defaults to `offline` and
  `SANDBOX_BUYER_EMAIL` to `buyer@personal.example.com`.
- **Where it may run.** It is refused (`500 config_error`) when `VERCEL` is set, and when
  `NODE_ENV` is `production` unless `CI` is `true`. `GET /api/health` reports `offline: true` and the
  sidebar shows an "Offline demo" badge.

## Content Security Policy

Every response carries `Content-Security-Policy: default-src 'self'; script-src 'self'
'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self';
connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src
'none'`. Development adds `'unsafe-eval'` to `script-src`. See [decision 0020](decisions/0020-proof-and-hardening.md)
for why scripts are not limited by a nonce.

## Demo tools

In demo mode the sidebar links to `/demo-tools` ("Demo tools"), a page behind the demo cookie like
the other screens that holds the "Reset the demo" button and the "Run today's preparation now" button
(`POST /api/demo/prepare`). Outside demo mode the link is hidden and
the page says the tools are available only in demo mode. When `remindersLeftToday` is 0, Nudges shows
"Today's PayPal reminder limit for the demo account is used up. Drafts and your own email still work; PayPal reminders resume
tomorrow." and disables the send buttons.

## Dates and the demo clock

"Today" always comes from `src/lib/clock.ts`. When `DEMO_TODAY` is set
(`YYYY-MM-DD`), every due-state, overdue and risk calculation uses that date,
and the UI shows a small "Demo date" label. This lets real sandbox invoices
appear overdue in the demo without faking PayPal data.

## Demo story

In demo mode the sandbox holds a fixed story of nine invoices to five clients, defined in
`src/lib/demo/story.ts` with every date as an offset from `today()`, and every client in a country
(Okafor & Reyes PT, Brightwell Labs GB, Northpine Studio CA, Tandem Health US, Halden Coffee Co. US).
Each carries the memo `dueline-demo:<generation>:<key>`; an invoice made before generations existed
has `dueline-demo:<key>` and counts as generation 0. Older invoices are recorded as paid outside
PayPal (`BANK_TRANSFER`, type `EXTERNAL`) so the late-payer radar has history. Story invoices are made
with the LUT declaration (when the profile has a LUT ARN) and the profile's default SAC, and one past
gentle reminder is written to Dueline's own reminder log for Okafor & Reyes' "Website copy"; nothing
is sent to PayPal for it. Seeding also writes a `sent` and a `paid` activity row at the story's dates
(09:00 India time) with the ids `demo:<generation>:<key>:sent` and `:paid`, which a later webhook for
the same invoice and kind reuses.

- **Generations.** The store keeps the current generation (`id`, `seededOn`). `POST /api/demo/reset`
  starts the next one and seeds the whole story from today, cancelling the open story invoices of
  older generations. Paid ones stay in PayPal, which cannot remove them. With no generation stored
  the current one is 0, so the story already there stays on show until the first reset.
- **Visibility.** In demo mode every list that feeds a screen or an export (Receivables, the due line,
  Clients, the late-payer radar, the forecast, fees lost, the export register, GSTR-1, the year
  summary, Activity, search, the digest and the reminder drafts) reads one rule, `isShownInDemo`.
  Shown: invoices of the current story generation; invoices created through Dueline (the
  `dueline-request:` memo); and any invoice paid through PayPal (status `PAID`), whatever its
  marker or generation, because a real payment is the strongest proof. Hidden: unpaid invoices and
  invoices recorded as paid outside PayPal that have no Dueline marker (made in PayPal's dashboard),
  older-generation story invoices that were not paid through PayPal, cancelled invoices and invoices hidden with `POST /api/demo/hidden-invoices`.
  Outside demo mode nothing is hidden. The invoice page of a hidden invoice still opens.
- **Daily re-seed.** The daily run starts a new generation when the current one is 7 or more days old
  (by `today()`), so the story does not age out. It only cancels the open story invoices of older
  generations, never touches any other invoice, waits behind the one-reset-per-10-minutes limit
  (skipped and logged when the limit was hit) and logs counts only.

`npm run seed` creates what the current generation is missing. See
[decision 0015](decisions/0015-demo-story-and-reset.md) and
[decision 0021](decisions/0021-demo-generations-and-human-reminders.md).
