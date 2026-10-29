# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

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
