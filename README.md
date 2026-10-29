# Dueline

Cross-border receivables for freelancers in India, built on PayPal.

[![CI](https://github.com/rishibhaskar777/dueline/actions/workflows/ci.yml/badge.svg)](https://github.com/rishibhaskar777/dueline/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Status: in development for the PayPal AI Hackathon 2026. Everything runs on the PayPal sandbox and
no real money moves.

## The problem

Freelancers in India who are paid from abroad lose time writing invoices. They lose 5 to 8 percent
to fees and currency conversion that they cannot see in advance. Many avoid chasing clients who pay
late.

## What Dueline does

1. **Shows what reaches your bank, in rupees.** An estimate before you send an invoice, and
   PayPal's own figures after it is paid. _This is what makes Dueline different._
2. **Flags clients who pay late.** Habitual late payers are scored, and Dueline offers an
   early-payment discount through PayPal. _This is what makes Dueline different._
3. **Keeps export paperwork ready.** A suggested RBI purpose code for each invoice, an optional LUT
   line, and a monthly export register to match PayPal's monthly FIRA. _This is what makes Dueline
   different._
4. **Drafts invoices from a client chat.** Paste the conversation and Dueline fills a PayPal
   invoice for you to review and approve.
5. **Drafts polite reminders.** Reminders get firmer over time. You approve each one and PayPal
   sends it.
6. **Draws every invoice as a line.** The "due line" runs from the day you sent the invoice to the
   day it was paid, so late payments stand out.

## What works

- [ ] Rupee payout estimate before sending
- [ ] PayPal's actual payout figures after payment
- [ ] Late-payer score and early-payment discount
- [ ] Purpose code suggestion, LUT line and monthly export register
- [ ] Invoice draft from a pasted chat
- [ ] Create and send invoices through PayPal
- [ ] Reminder drafts and sending
- [ ] Due line view of receivables
- [ ] Webhook updates from PayPal
- [ ] Hosted demo

## Tech stack

| Area       | Choice                                                        |
| ---------- | ------------------------------------------------------------- |
| Runtime    | Node.js 24                                                    |
| Language   | TypeScript 5.9, strict                                        |
| Framework  | Next.js 16 (App Router, Cache Components), React 19           |
| Styling    | Tailwind CSS 4, shadcn/ui, lucide-react                       |
| Tables     | AG Grid 36                                                    |
| Payments   | PayPal Server SDK 2 and a small typed client for Invoicing v2 |
| AI         | AI SDK 7 with Google Gemini                                   |
| Validation | Zod 4                                                         |
| Data       | Neon Postgres, or in-memory when no database is configured    |
| Rates      | Frankfurter (European Central Bank)                           |
| Tests      | Vitest 5                                                      |
| Hosting    | Render and Neon free tiers, Singapore                         |
| CI         | GitHub Actions, CodeQL, Dependabot                            |

## Getting started

Prerequisites: Node.js 24 and a PayPal sandbox account.

```bash
git clone https://github.com/rishibhaskar777/dueline.git
cd dueline
npm install
cp .env.example .env.local
npm run dev
```

Fill in `.env.local` using the comments in `.env.example`, then open http://localhost:3000.

## Scripts

| Script                 | What it does                              |
| ---------------------- | ----------------------------------------- |
| `npm run dev`          | Start the development server              |
| `npm run build`        | Build for production                      |
| `npm start`            | Run the production build                  |
| `npm run lint`         | Lint with ESLint, failing on any warning  |
| `npm run typecheck`    | Generate Next.js types and run TypeScript |
| `npm test`             | Run the tests once                        |
| `npm run test:watch`   | Run the tests in watch mode               |
| `npm run format`       | Format all files with Prettier            |
| `npm run format:check` | Check formatting without changing files   |

## Project structure

```
src/
  app/          pages and API route handlers
  components/   UI components
  lib/          API client, money, risk, export, PayPal, AI and storage code
  mocks/        sample data used by the stub routes and tests
  types/        shared types and Zod schemas
docs/           architecture, API contract, decision records
tests/          unit tests and fixtures
```

## Documentation

- [Architecture](docs/architecture.md)
- [API contract](docs/api-contract.md)
- [Decision records](docs/decisions/)

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request. Everyone taking part is
expected to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Security

Dueline runs on the PayPal sandbox only. Report vulnerabilities as described in
[SECURITY.md](SECURITY.md).

## Licence

[MIT](LICENSE)
