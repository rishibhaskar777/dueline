# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- The late-payer radar. Dueline scores each client from their paid and overdue invoices, by name and
  email together, as reliable, on watch or a late payer, with a one-sentence reason worked out from
  the numbers. For a client on watch or a late payer the new invoice screen offers a 1% or 2%
  early-payment discount in one click, and re-checks when the client's name or email is edited. The
  receivables table tags clients on watch and late payers, and the invoice panel shows the reason.
  `GET /api/clients/risk` is built and no longer a stub, `POST /api/invoices/extract` now returns
  the draft client's risk, and every invoice carries a `riskLevel`.
- Nudges. For every overdue invoice Dueline drafts a polite reminder in a suggested tone (gentle,
  firm or final). You switch tone (if you have edited the text, the card asks "Replace your edits with a Firm draft?"
  first), edit the text and click "Send reminder through PayPal"; PayPal
  emails the client from your account with the invoice and its Pay now button. Drafts are written by
  Gemini and checked in code (length, invoice number, amounts, no links or email addresses; a client called "Acme.io" is not taken for a link), with a
  template when AI is unavailable or the check fails. `GET /api/reminders`,
  `POST /api/reminders/draft` and `POST /api/reminders/send` are built and no longer stubs. Dueline
  sends one reminder per invoice a day, PayPal allows two a day for the account, and drafting is
  limited to 20 an hour per address.
- The export register: for any month, the invoices paid in it (India time) with the foreign amount,
  PayPal's fee and net, the rupees received, the purpose code, whether the invoice was under LUT and
  PayPal's transaction ID (from the invoice's own latest payment when PayPal reported no payout
  figures), to match line by line with PayPal's monthly FIRA. `GET /api/export-register`
  is built and no longer a stub, and "Download CSV for your CA" gives the accountant a spreadsheet-safe
  file. Rupees are PayPal's figures when reported, otherwise an estimate at the ECB rate of the payment
  date, and each row says which.
- A payout records when it was paid (`paidAt`) and PayPal's transaction ID. Payouts stored earlier are
  read from PayPal once more to gain them.
- ECB rates for a past date, fetched once per date.

- The receivables screen: totals in rupees, the due line for every invoice, a sortable and
  searchable invoice table, an invoice panel that sets the estimate against PayPal's own figures
  for a paid invoice, and a live activity feed. It refreshes every 10 seconds while the tab is open, and re-checks today's date every 5 minutes.
  The table starts with the most overdue invoices and ends with the paid ones.
  An invoice due today reads "Due today" in the table, the panel and the due line, and every unpaid
  line on the due line is at least 8 px long.

### Changed

- Receivables labels rupees "PayPal" only when PayPal reported them; rupees worked out from
  PayPal's net at the ECB rate are labelled as an estimate.
- A paid invoice's paid date, days late and "paid this month" use the India date of the payment's
  timestamp, not PayPal's `payment_date`, which is in PayPal's time zone. A payment at 01:06 IST on
  30 Oct is now paid on 30 Oct.
- The AI draft names the business being billed as the client and writes item names as invoice lines.
  Stored answers written under the old prompt are no longer reused.
- A delivery date in a chat is no longer taken as the payment due date: with no payment terms the due date is 14 days from today, with a warning. The discount note now names the same date as the due date.
- A discount is limited to 1 to 20 percent over 3 to 30 days, and a due date in the past is refused.
- The store can release a request that is still in progress.
- The purpose-code list uses the RBI's official labels and adds P1015 and P1017 (checked on 30 Oct
  2026).
- `engines.node` is `24.x`, so Vercel no longer moves the project to a newer Node.js major version by
  itself.
- Hosting moves from Render to Vercel (functions in Singapore next to the database).
- Settings have one fixed fee per currency (`fixedFees`) instead of one `fixedFee`, and the default
  conversion markup is 3.0%.
- `GET /api/invoices` reads every listed invoice in full, so the work description and the payer link
  are filled in. Full invoices are cached for 10 minutes and the finished list for 20 seconds.
- An unexpected server error is answered with 500 `internal_error`.
- A paid invoice's date is now read from a plain date or a timestamp and converted to Asia/Kolkata.

### Fixed

- PayPal invoicing webhooks are read from resource.invoice, as PayPal sends them.

### Added

- New invoice screen: paste a client chat (or start blank), review and correct the draft, see what
  reaches your bank in rupees, and click "Create and send invoice". A sample chat and a "Send to the
  demo buyer" button are included. If a held request is edited and sent again, the screen explains
  that the details changed and offers "Create another".
- `POST /api/invoices` creates the PayPal draft and sends it, and `POST /api/invoices/{id}/send`
  retries sending a draft. A repeated request returns the stored result, so a double click or a
  timeout never creates a second invoice. A send that fails answers "Draft created, not sent". A
  request left in progress for more than two minutes is resolved by finding the invoice again from
  its memo.
- An early-payment discount through PayPal's own invoice discount, with the due date moved to the
  earlier of the chosen date and the end of the discount window.
- `GET /api/purpose-codes` returns the real list, and `GET /api/demo/recipient` returns the sandbox
  buyer's address in demo mode.
- In demo mode, sending an existing draft is refused unless it is addressed to a sandbox buyer.
- `paypal_timeout` (504) in the API contract, and decision record 0011.
- Setup steps for turning off automatic reminders in the sandbox business account.
- Invoice drafting from a pasted chat: `POST /api/invoices/extract` hides emails and phone numbers,
  asks Gemini for a draft, checks every field in code and returns warnings for anything it could not
  confirm. Limits of 10 extractions an hour per address and 400 model calls a day, a fallback model,
  and a 24-hour cache for identical chats. `risk` stays `null` until the late-payer radar is built.
- A draft item is flagged when its price does not appear as a number in the words quoted from the
  chat.
- A chat with phrases that look like instructions to the AI gets a warning to check every item.
- `npm run ai:check` and `npm run extract:check`, and migration `003_cache_entries.sql`.
- Decision record 0010 on AI invoice drafting.
- Demo password: a shared password with a signed cookie protects the app screens and every API
  route except `GET /api/health`, `POST /api/webhooks/paypal` and `/api/demo/session`. Includes the
  `/demo` sign-in screen, a "Lock demo" button, `POST` and `DELETE /api/demo/session`, a limit of
  10 attempts in 15 minutes and `SESSION_SECRET`. In production both settings are required.
- PayPal webhooks: signatures are verified with PayPal, each event is processed once, and a paid or
  sent invoice event re-reads the invoice, stores the payout and records activity.
  `GET /api/activity` now returns the latest 20 stored events.
- `invalid_webhook` (400) in the API contract.
- `render.yaml` Blueprint for Render's free plan, a "Deploying" section in CONTRIBUTING.md and
  decision record 0008.
- Payout estimate from PayPal India's published fees and the ECB's daily rate, with the date and
  source of the rate, and `POST /api/payout-estimate` now calculates instead of returning sample
  data.
- Daily ECB rates through Frankfurter, fetched once a day and stored, with the latest stored rates
  and then manual rates as fallbacks, and `npm run rates:check`.
- `GET` and `PUT /api/settings` now store real settings: a fee percentage, a fixed fee for each
  currency, the conversion markup, the rate source and manual rates.
- "Fees and rates" screen with a settings form and a "What reaches your bank" calculator.
- `payoutInr` and the rupee totals now come from PayPal's figures where they exist and from the
  estimate otherwise.
- `internal_error` (500) in the API contract.
- Security headers on every response, and no `X-Powered-By` header.
- Decision record 0007 on fees and rates.
- Validated environment settings that refuse to start unless `PAYPAL_ENVIRONMENT=sandbox`.
- A date module for Asia/Kolkata with the demo clock, day arithmetic and tests.
- PayPal sandbox client: cached OAuth token, REST client for Invoicing v2 with a timeout and one
  retry on 401, Server SDK wrappers, and mapping from PayPal invoices to `InvoiceSummary`.
- Actual payout lookup from the PayPal capture, with Transaction Search as a fallback.
- Postgres store (Neon) with an in-memory fallback, and SQL migrations run by `npm run db:migrate`.
- `GET /api/health` and `GET /api/invoices` now read real data instead of sample data.
- Rupee totals for the receivables page.
- `npm run sandbox:check` and `npm run seed` scripts for the PayPal sandbox.
- Decision record 0006 on storage.
- `config_error` (500) in the API contract.
- Next.js 16 app with Tailwind CSS 4, shadcn/ui and the Dueline design tokens.
- App shell with sidebar navigation, a PayPal connection status line and five placeholder pages.
- Placeholder landing page and a not-found page.
- Shared types and Zod request schemas matching the API contract.
- Fixed list of RBI purpose codes.
- Sample data and stub API routes for every endpoint in the API contract.
- Typed API client, the only way screens reach the server.
- Unit tests for fixtures, schemas, stub routes and the API client.
- Prettier, ESLint, Vitest and TypeScript scripts.
- GitHub Actions CI, CodeQL analysis and Dependabot configuration.
- README, contributing guide, code of conduct, security policy, architecture overview and
  decision records.
