# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

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
