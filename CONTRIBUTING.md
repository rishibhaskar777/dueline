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
