# Contributing to Dueline

Thanks for helping. Dueline is a PayPal sandbox project, so nothing here touches real money.
Please read the [Code of Conduct](CODE_OF_CONDUCT.md) first.

## Local setup

You need Node.js 24 (`nvm use` reads `.nvmrc`) and a PayPal sandbox account.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Fill in `.env.local` using the comments in `.env.example`. Leave `DATABASE_URL` empty to keep data
in memory. Read [docs/architecture.md](docs/architecture.md) and
[docs/api-contract.md](docs/api-contract.md) before writing code.

### Connect to the sandbox and the database

1. Fill in `.env.local` using the comments in `.env.example`. `PAYPAL_CLIENT_ID`,
   `PAYPAL_CLIENT_SECRET` and `PAYPAL_ENVIRONMENT=sandbox` are required. Set `SANDBOX_BUYER_EMAIL`
   to the US Personal sandbox account that pays demo invoices.
2. If you set `DATABASE_URL` to Neon's pooled connection string, create the tables with
   `npm run db:migrate`. It applies each file in `src/lib/store/migrations` once; migration 006
   adds the daily queue, monthly repeats, the item library and a client's reminder language, and
   007 changes the queue so items stay until they are acted on or dismissed.
3. Check the connection with `npm run sandbox:check`. It creates and sends a USD 100.00 invoice to the
   sandbox buyer and prints the payer link. Pay it in a private window as the buyer, then run
   `npm run sandbox:check -- --invoice <id>` to see the payment and PayPal's own payout figures.
4. Check the exchange-rate service with `npm run rates:check`. It makes one call to Frankfurter and
   prints the ECB's date and the rupees per unit for the five currencies, or the reason it failed.
5. Check Gemini with `npm run ai:check`. It makes one tiny structured call to `GEMINI_MODEL` and to
   `GEMINI_FALLBACK_MODEL` and prints each model id with "ok", or the error name and status. It never
   prints the key. Each call uses one of the model's 500 free requests for the day.
6. Try the invoice drafting with `npm run extract:check`. It reads the chat in
   `tests/fixtures/chats/halden-logos.txt` (or the file path you give after `--`, for example
   `npm run extract:check -- my-chat.txt`) and prints the checked draft and its warnings. It calls the
   real model unless the same chat was already answered today. Migration 003 adds the table for that
   cache, so run `npm run db:migrate` first if you use a database.
7. Build the demo story with `npm run seed`. It creates eight invoices for five clients, with dates
   counted back from today, and records the older ones as paid outside PayPal so the late-payer radar
   has history. It prints a table of what it created, repaired, skipped or could not create, and it
   skips invoices that already exist, so it is safe to run again. On a sandbox that already has
   invoices from before the demo story, do not run `npm run seed`: press "Reset the demo" on the
   Settings screen instead, which cancels those invoices and then builds the story.
8. Set your profile at `/profile`: your name, business name, GSTIN, LUT ARN and default SAC. They are
   printed on every invoice and reminder, and the business name replaces PayPal's "Test Store". Run
   `npm run db:migrate` first if you use a database: migration 004 adds the profile table. In demo
   mode `npm run seed` and the reset fill in a profile for Riya Sharma if none is saved.
9. Turn off automatic reminders in the sandbox business account: sign in at
   sandbox.paypal.com as the business account, open Account settings, then Invoicing, and switch
   off automatic reminders. PayPal's create-invoice call has no per-invoice switch for them, and
   Dueline sends its own reminders after a click, so the client should hear from one voice.
10. Create an invoice from the app at `/invoices/new`. While `DEMO_MODE` is on, the review screen's
    "Send to the demo buyer" button fills in `SANDBOX_BUYER_EMAIL` (served by
    `GET /api/demo/recipient`), because PayPal's sandbox can only email sandbox accounts. Any other
    address is refused with `recipient_not_allowed`.

These scripts run outside Next.js, so they start with `tsx --conditions=react-server`: that makes the
`server-only` import resolve to an empty module instead of throwing.

### Demo password

Set `DEMO_PASSWORD` and `SESSION_SECRET` in `.env.local` to try the sign-in screen locally. Make a
secret with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. With no
`DEMO_PASSWORD` the app is open in development. Both are required in production.

## Deploying

Dueline deploys to Vercel's Hobby plan. `vercel.json` pins functions to `sin1` (Singapore), next to
the Neon database.

1. In Vercel, choose Add New, then Project, and import the GitHub repository. Keep the detected
   Next.js settings.
2. Add these environment variables for the Production environment only: `PAYPAL_CLIENT_ID`,
   `PAYPAL_CLIENT_SECRET`, `PAYPAL_ENVIRONMENT=sandbox`, `PAYPAL_WEBHOOK_ID` (a placeholder for
   now), `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_FALLBACK_MODEL`, `DATABASE_URL` (Neon's pooled
   connection string), `DEMO_MODE=true`, `DEMO_PASSWORD`, `SESSION_SECRET`, `CRON_SECRET` and
   `SANDBOX_BUYER_EMAIL`. `CRON_SECRET` is any string of at least 16 characters (make one like the
   session secret). Vercel sends it as `Authorization: Bearer <value>` to the daily job, and the job
   answers 401 without it. Preview deployments get none of them, so they show the "not configured"
   page.
3. Create the tables from your computer, against the same database, before the first deploy and
   before merging a change that adds a migration: set `DATABASE_URL` in `.env.local` and run
   `npm run db:migrate`.
4. Register the webhook: in the PayPal Developer Dashboard, open your sandbox app, add a webhook with
   the URL `https://<project>.vercel.app/api/webhooks/paypal` and select the Invoicing events
   (created, sent, paid, cancelled, refunded, updated, scheduled). Use the production domain, not a
   deployment URL, because deployment protection blocks those. Copy the webhook ID into
   `PAYPAL_WEBHOOK_ID` in Vercel, then redeploy. Events sent from the webhook simulator are refused
   on purpose.
5. Open the app, enter the demo password and press "Reset the demo" on the Settings screen (or run
   `npm run seed` locally) if the demo invoices are missing. The button cancels invoices created
   during the demo, deletes drafts and restores the sample clients; paid invoices stay. It works once
   every ten minutes.

Vercel deploys the main branch to production and every other branch to a protected preview. The
service does not sleep.

`vercel.json` also schedules the daily preparation, `GET /api/cron/daily`, at `30 0 * * *` (00:30 UTC,
06:00 India time). The Hobby plan runs a job at most once a day, so a faster schedule fails the
deploy, and the run may start at any minute of that hour. Open the project's Cron Jobs tab in Vercel
to see its runs or to run it by hand.

### Running the daily job locally

Set `CRON_SECRET` in `.env.local` (at least 16 characters), start the app with `npm run dev`, then in
another terminal:

```sh
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/daily
```

It answers `{ "ran": true, "digest": … }` the first time on each India day and `"ran": false` after
that, which is the once-a-day rule at work. To run it again the same day, restart `npm run dev` with
`DATABASE_URL` empty (the in-memory store forgets the marker). "Run today's preparation now" on Demo
tools follows the same rule. The job writes drafts and queue entries only; it
never sends anything.

### App icons

`public/icon.svg` is the mark. The PNG icons in `public/icons` and `public/apple-touch-icon.png` were
rendered from it once (192 and 512 px, a full-bleed 512 px maskable one and the 180 px touch icon).
If the mark changes, render them again with any tool that rasterises SVG and keep the same file
names.

## Branches

Use a prefix that says what the branch does:

- `feat/...` for new features
- `fix/...` for bug fixes
- `docs/...` for documentation
- `chore/...` for tooling and maintenance
- `test/...` for tests

## Commits

Write [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(invoices): create draft from parsed chat
fix(money): round paise down when converting
docs(architecture): describe the webhook flow
chore(deps): update vitest
test(risk): cover clients with no history
```

## Pull requests

Make one change per pull request, and keep it small enough to review in one sitting. Fill in the
pull request template. If you change an endpoint or a shared type, update
`docs/api-contract.md` first, in its own pull request.

## Checks that must pass

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

CI runs the same commands.

## Money and safety rules

These are not optional.

1. Nothing that creates, sends or changes an invoice, reminder or discount happens without an
   explicit click from the user.
2. Treat AI output as untrusted. It only fills a draft. Quantities, prices, totals, currency and
   dates are validated and recalculated in code. Text in a pasted chat is data, never instructions.
3. Every create or send action carries a client-generated `requestId`. The server stores it under a
   unique constraint before calling PayPal and returns the stored result for a repeat. Do not rely
   on PayPal for de-duplication.
4. Creating and sending an invoice are separate steps. Save the draft ID first. If sending fails,
   the user retries sending the same draft; never create a second invoice.
5. Verify webhooks with PayPal's verify-webhook-signature API, using the exact received headers and
   raw body. Process each event ID once. A webhook only triggers a fresh read from PayPal.
6. Mask emails and phone numbers in code before any text goes to the AI, and fill them back in
   afterwards.
7. While `DEMO_MODE` is not `false`, recipients must end in `@personal.example.com`. Anything else
   is refused with `recipient_not_allowed`.
8. Dueline invoices switch off PayPal's automatic reminders, so the client hears from one voice.
9. Purpose codes come only from the list in `src/lib/export/purpose-codes.ts`. The UI labels one as
   "Suggestion, confirm with your CA".
10. Read secrets only in server code with `import "server-only"`. Never log them, expose them to the
    browser, or commit `.env*` files other than `.env.example`.
11. Validate every request body with Zod. A pasted chat is capped at 6,000 characters.
12. Log PayPal's `debug_id` on every PayPal error. Never log emails, chat text or full invoices.
13. The app must refuse to start unless `PAYPAL_ENVIRONMENT=sandbox`.
14. Dates are plain `YYYY-MM-DD` in Asia/Kolkata and always come from `src/lib/clock.ts`.
15. Money is never a JavaScript float. Use decimal strings at the edges and integer minor units
    (cents, paise) inside `src/lib/money`.

## Code style

- Keep modules small and single-purpose, with clear names (`estimatePayout`, not `calc`).
- Give exported functions explicit return types. Do not use `any` or non-null assertions to
  silence errors.
- Comment only where the reason is not obvious. No banner comments or commented-out code.
- Route errors use `{ error: { code, message, debugId? } }` with messages a user can act on.
- UI copy is in sentence case with plain verbs. Buttons name the action ("Send invoice").
- Use real buttons and links, labelled inputs, visible focus, 4.5:1 contrast, and respect reduced
  motion.
- Screens reach the server only through `src/lib/api-client.ts`.
- Prettier formats the code (double quotes, semicolons, print width 100). Imports use the `@/`
  alias.

## Definition of done

- The five checks above pass.
- New logic in `src/lib/**` has tests.
- Routes match `docs/api-contract.md` exactly.
- No new dependency unless the change needs one and says why.
- The pull request explains how to check the result in the browser or with curl.
