# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- A daily preparation each morning (06:00 India time, Vercel Cron). It writes reminder drafts for
  overdue invoices, lists the ones at least 3 days late (a setting) in a Today list at the top of
  Nudges with "Review and send" and "Dismiss for today". Items stay until acted on or dismissed;
  reminder items are refreshed by each run, retainer items stay until sent or dismissed. It turns monthly repeats into drafts, and
  records a digest. It never sends anything: every item is a place to start. It runs once a day,
  protected by `CRON_SECRET`; "Run today's preparation now" on Demo tools runs the same job.
- Monthly repeats for retainer clients: "Repeat monthly" on an invoice saves a schedule (day 1 to 28),
  the client page lists the client's repeats with pause and delete, and a due repeat becomes a draft
  that opens New invoice filled in.
- An item library: "Save to library" on an invoice item, a searchable "Add from library" on New
  invoice, and rename and delete on Profile.
- Reminders in the client's language (English, German, French, Spanish, Dutch, Portuguese, Hindi),
  set on the client page. Templates exist for each, the same checks apply to amounts written in that
  language's number format, and a card can switch back to English.
- A "This morning" card at the top of Receivables: paid since yesterday, newly overdue, due in the next
  3 days and drafts prepared. Up to three rate alerts in Settings (for example USD above ₹96) are marked
  on the Rates widget, counted in the sidebar and listed in the digest, with an optional notification in
  this browser while the app is open.
- Light and dark themes with one toggle button in the sidebar and the phone top bar. A first visit follows the device, the choice is then kept, and the new theme grows from the button as a circle unless motion is reduced.
- A command palette (Ctrl+K or Cmd+K) to go to any page, open a client or an invoice, start a new
  invoice, draft a reminder or toggle the theme, and "?" for the list of shortcuts.
- A phone layout below 768 px (top bar with a menu, card lists instead of tables, the due line
  scrolling with its labels pinned, 44 px tap targets) and an installable app: a web manifest, icons
  and a theme colour. There is no service worker and no offline mode.
- `GET /api/cron/daily`, `POST /api/demo/prepare`, `GET /api/queue`, `POST /api/queue/{id}/dismiss`,
  `GET /api/digest`, `GET /api/rate-alerts`, `GET`/`POST` `/api/repeats`, `PATCH`/`DELETE`
  `/api/repeats/{id}`, `GET`/`POST` `/api/items`, `DELETE /api/items/{id}` and
  `PUT /api/clients/by-key/{key}/language`. Migration 006 adds the queue, repeats, library and the
  client language; 007 lets queue items stay until acted on.

- Money views on Receivables: a forecast of what will arrive in the next 30, 60 and 90 days (weighted by
  each client's payment history, with the best case beside it), what getting paid costs this
  financial year, the invoices falling due in the next 14 days, the clients furthest behind, and
  today's rupee rates against their 30-day average.
- A Customise button on Receivables to show, hide and reorder these widgets, with Reset to default.
  The layout is kept in this browser only.
- A Clients page with a searchable table, and a page for each client with their invoices, risk,
  private notes and a "New invoice for this client" button.
- A page for each invoice with its history (created, sent, reminders, views, payment, cancellation),
  its items, SAC, purpose code and LUT, and the actions its status allows: send a reminder,
  duplicate, record a payment outside PayPal, and cancel. Cancelling does not email the client unless
  you tick the box. Receivables rows and the invoice panel link to it.
- `GET /api/dashboard`, `GET /api/clients`, `GET /api/clients/by-key/{key}`, `PUT /api/clients/by-key/{key}/notes`,
  `GET /api/invoices/{id}`, `POST /api/invoices/{id}/cancel` and
  `POST /api/invoices/{id}/record-payment`, and the `invalid_state` error. Migration 005 adds client
  notes.

### Changed

- Nudges opens at once. `GET /api/reminders` no longer waits for the model: each overdue invoice comes
  back with the draft the model wrote earlier, or the template marked `pending`. The screen asks for
  better drafts one card at a time and replaces the text only if it has not been edited. The draft
  cache key now includes the language.
- `Settings` gains `prepareReminders`, `remindAfterDays` and `rateAlerts`; `ReminderDraft` gains
  `language` and `pending`; `ClientDetail` gains `language`; `DashboardResponse` gains `rateAlerts`.
- Colours come from tokens in both themes. The AG Grid theme and the due line read them, and a test
  checks text contrast in both themes.
- Reminder drafts are cached under a new prompt version, because they no longer end in "Thank you".
- The LUT line on an invoice is now the declaration; invoices with the earlier line still count as
  under LUT.
- One rupee figure per payment. A paid invoice's rupees are PayPal's own figure when reported,
  otherwise PayPal's net at the ECB rate of the payment date less the markup, in Receivables, the
  invoice panel, the due line tooltip and the export register alike. The panel names the rate
  ("ECB rate of 30 Oct 2026"). `InvoiceSummary` gains `payoutSource` and `rateDate`.
- A payment recorded outside PayPal has no PayPal fee or markup: its rupees are its amount at the ECB
  rate of the payment date, tagged "outside PayPal", and the table and panel say "Paid outside
  PayPal". `Totals.paidThisMonthInr` is replaced by `paidThisMonthPayPalInr` and
  `paidThisMonthOutsideInr`; the "Paid this month" tile adds "plus ₹X recorded outside PayPal".
- The export register hides a rupee part that is zero, cites PayPal's monthly digital FIRA with a
  "Learn more" link, and puts the CA's columns first (purpose code shows the code, with its
  description in a tooltip).
- The receivables table fits a laptop: work, issue date and purpose code moved into the invoice panel
  (still searchable), and the activity feed sits beside the table only on very wide screens.
- Reminder tone follows the client's record: a late payer is chased one step firmer, and the card
  says why. Risk readings based on fewer than 4 invoices say so.
- Invoices belong to one client when the business name matches or, outside demo mode, the email does,
  so a client with a new email keeps their history.
- The purpose code is kept in the invoice's private memo instead of the reference field the client
  sees as "Reference no."; older invoices are still read.
- The activity feed dates the demo story by its own dates, and shows a date for anything a week old.
- The due line shows the last 60 days and the next 21 with "Show older", keeps the "Today" label and
  status text clear of other labels, says "Paid N days late" in the late colour, and uses 12 px text
  at least.
- Demo safety: reset leaves invoices created in the last 30 minutes alone and says how many; when
  PayPal's two reminders a day are used up Nudges says so and disables sending; the reset button
  moved from Fees and rates to a "Demo tools" page that appears in the sidebar in demo mode only.
- `GET /api/reminders` returns `remindersLeftToday`, and `POST /api/demo/reset` returns `kept`.

### Fixed

- The new invoice review screen no longer builds its purpose code list and client reading anew on
  every render.

### Added

- A business profile (`/profile`, "Profile" in the sidebar): your name, business name, GSTIN, LUT
  ARN and end date, default SAC, website and reminder sign-off, with a preview of the invoice
  header. `GET` and `PUT /api/profile`, migration 004.
- Invoices carry the profile: the business name replaces PayPal's sandbox name, with your name,
  GSTIN and website; items show `SAC <code>`; "Export under LUT (no IGST)" writes the declaration,
  the LUT ARN and the place of supply. The review screen warns when the ARN is missing or the LUT
  has ended, and when your name or business name is empty. `LineItem` gains `sac`.
- Reminders end with your sign-off and name; none is invented when the name is empty.
- Export register: a SAC column, and your GSTIN in a comment line above the headers.
- GSTR-1 export (`GET /api/exports/gstr1`): the export-of-services rows for invoices issued in a
  month, in rupees at the ECB rate of the invoice date. Estimate; confirm with your CA.
- Year summary (`GET /api/exports/annual`, JSON or CSV): receipts through PayPal and outside it,
  PayPal fees and conversion loss, section 44ADA income and its limit, for a financial year. Estimate;
  confirm with your CA.
- The demo seeds a profile for Riya Sharma only when none is saved.
- A rich, repeatable demo story. `npm run seed` now builds eight sandbox invoices for five clients,
  with older invoices recorded as paid outside PayPal, so the late-payer radar shows Reliable
  (Halden Coffee Co.), Watch (Brightwell Labs) and Late payer (Okafor & Reyes) for real reasons.
  `POST /api/demo/reset` is built and no longer a stub: in demo mode it cancels open invoices outside
  the story, deletes drafts and restores the story, once every ten minutes. Settings has a "Demo"
  card with a "Reset the demo" button. The response changes from `204` to the counts of what changed.
- The export register lists invoices recorded as paid outside PayPal after the table, with their
  numbers, and leaves them out of the rupee totals, because they are not on PayPal's FIRA.
- A landing page that explains Dueline on one screen and leads into the demo.

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
