# 0020. Proof and hardening

## Status

Accepted.

## Context

Dueline claims that it works and that it is safe. Unit tests prove the logic, but they cannot see a
page that fails to load its scripts, a sidebar that runs off the screen, a button that a keyboard
cannot reach or a browser that blocks a script. The people who judge the project will click through
it, run it themselves and try to break it. Three things were also missing: a way to run the whole app
without a PayPal account, a Gemini key or a database; a measurement of how well the drafting from a
chat works; and a full Content Security Policy (the header carried only the framing directives).

## Decision

### Offline mode

`DUELINE_OFFLINE=true` runs the real app with nothing outside the computer. The choice is made once,
in `getEnv()`, and a few narrow seams in the code read it:

| Part          | Online                                   | Offline                                                                                        |
| ------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------- |
| PayPal        | Invoicing REST, the Server SDK, webhooks | A fake that keeps invoices in memory and answers the same calls (`src/lib/paypal/offline`)     |
| Storage       | Postgres when `DATABASE_URL` is set      | The in-memory store, whatever `DATABASE_URL` says                                              |
| Drafting      | Gemini                                   | A small parser for the invoice and templates for reminders; no call                            |
| Exchange rate | ECB through Frankfurter                  | The rates saved in settings, which default to the ECB rates of 29 Oct 2026, reported as manual |

The seams are narrow: `paypalFetch` hands a call to the fake before it asks for a token, the payout
lookup reads the fake's captures, `askModel` is skipped in both places that use the model, and the
rates module treats offline like a hand-typed rate. The server reports those rates as `manual`, but
the screens that show the source say "Saved rates (offline demo)", since the setting may still say
ECB and nobody typed the rates in. Everything else, including the checks in code
that decide whether a draft is acceptable, runs unchanged. The parser's answer goes through
`checkModelDraft` like a model's, so the safety rules about AI output hold for it too.

The fake PayPal is the one that the unit tests already used (`createFakePayPal`, moved from
`tests/support` to `src/lib/paypal/offline`), so a test and the offline app are checked against the
same stand-in. It now also computes an invoice's total, gives a sent invoice a payer link, and
answers reminders and reads. A thin transport maps PayPal's paths to it.

On first use the fake is filled with the demo story (the eight invoices, with the older ones
recorded as paid outside PayPal) and four invoices paid through PayPal in the previous month and
this one, with PayPal's own fee and rupee figures. Without those, the export register would have
nothing to show, because it lists only payments that came through PayPal. Seeding is lazy rather
than in an instrumentation hook, because modules loaded by the hook are not guaranteed to be the
ones the routes use.

**Guards.** A deployed copy of this mode would hand every visitor a demo with a published password.
So `getEnv()` refuses it when `VERCEL` is set, and when `NODE_ENV` is `production` unless `CI` is
`true` (the end-to-end tests run the production build). Offline ignores PayPal keys, Gemini keys and
the database URL, forces `DEMO_MODE` on and defaults the password to `offline` and the buyer to
`buyer@personal.example.com`. The sidebar shows an "Offline demo" badge from `GET /api/health`, so a
screenshot cannot pass for the real sandbox. `npm run dev:offline` sets the password itself, so a
password in `.env.local` cannot make the instructions wrong.

**What it does not prove.** It does not check that PayPal behaves as the fake does: fee timing,
webhook signatures, rate limits and error bodies come from reading PayPal's documentation and from
the sandbox runs described in earlier records. Offline mode is for judging the product and for
testing the app, not for testing the PayPal integration.

### End-to-end and accessibility tests

Playwright drives Chromium against the production build in offline mode, started by its own
`webServer`. The production build is used because that is what runs on Vercel: the development
server hides problems with prerendering, hydration and headers. Chromium alone keeps the suite fast;
the app uses no feature that differs between engines.

The server keeps its data in memory, so tests run one at a time and each is written to hold whatever
the previous test left behind (the double-click test counts invoices before and after, not in total).
The demo sign-in allows ten attempts in fifteen minutes, so one set-up step signs in and the others
start from its cookie. The demo date is fixed at 4 Nov 2026 so that "last month" always holds the
same four PayPal payments.

The tests follow what a judge would do: the landing page and the password, a sample chat to a sent
invoice and a double click, a reminder and a tone switch over an edit, the export register and its
CSV header, a bad GSTIN, the theme, and the keyboard. One test visits every screen and fails on any
browser message about the Content Security Policy.

Axe-core checks the landing page, Receivables, New invoice (before and after the draft), Nudges, the
export register and Profile, each in both themes, against WCAG 2.0 and 2.1 A and AA and axe's best
practices. A serious or critical finding fails the test. Lesser findings are attached to the test as
annotations, so a run lists them. Rules are not switched off: a finding is fixed in the app.

The first run found two real problems, and both were fixed:

- The sidebar was taller than a 720 px screen, so "Lock demo" ran below the dark panel onto the light
  page, and its pale text had a contrast of 1.09:1. The sidebar now scrolls inside itself.
- Every row of the due line had an accessible name that put the due date between the amount and the
  status, so the words on the row were not one phrase inside it (WCAG 2.5.3, label in name). The name
  now starts with the row's own words, and the row's parts are separated by spaces so that they read
  as one phrase.

Nothing remained at a lower level. Axe finds only a part of what is wrong with a page. It cannot say
whether the reading order makes sense or whether a screen reader says something useful, so a person
using a screen reader is still the better test.

### Measuring the drafting

`npm run ai:eval` runs the real extraction (the model and then the checks in code) over 24 chats in
`tests/fixtures/chats`. Each folder holds a chat and an `expected.json`. The chats are short,
invented and varied: five currencies and one Dueline does not support, Hinglish, a rush fee, a
discount that is mentioned but not applied, no payment terms, net terms, a payment date, a past date,
a delivery date that is not a payment date, phone numbers, two email addresses, no email, one attempt
to give the AI orders and one chat with no prices.

For each chat the script compares the client, the currency, whether the items are exactly right
(count, quantity, unit price and a word of the name), whether the prices are right, the due date
against the chat's rule, whether the warnings that should appear did, whether the attempt to give the
AI orders was flagged, and whether any email or phone number from the chat appears in the text sent
to the model. The last check is made on the system prompt and prompt exactly as the extraction
builds them, against a list of contacts written by hand in `expected.json`, not found with the
masking code it is meant to test.

The run asks the model every time, bypassing the stored answers, and counts each call against the
app's daily allowance, stopping if it is used up. It pauses between calls for the free tier's
per-minute limit. It writes `docs/evaluation/extraction.md`. It is never run by a test or by CI: it
costs about 24 of the day's free calls, and its result changes with the model.

The comparison itself is ordinary code in `src/lib/ai/score-extraction.ts`, and a unit test runs it
over stored model answers, some right and some wrong on purpose, so the scorer is checked without a
model. Twenty-four chats are a small sample; the report says how many passed, not how likely the next
chat is to pass.

### Content Security Policy

The policy is:

```
default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';
img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';
base-uri 'self'; form-action 'self'; object-src 'none'
```

Scripts are the weak part. The better policy uses a nonce: `proxy.ts` makes one for each request and
sets `script-src 'self' 'nonce-…' 'strict-dynamic'`, and Next adds the nonce to its scripts. This was
tried on the production build. It does not work with the app as it is. With Cache Components the
pages are prerendered at build time, when there is no request and so no nonce. The prerendered
landing page holds 17 inline scripts and nine script tags with a source, and none of them carried
the nonce. Under `strict-dynamic` the browser ignores `'self'`, so every script on a prerendered page
would have been blocked. Next's own guide says nonces need every page rendered per request and that
Partial Prerendering is incompatible with them.

The second choice was a hash for the theme script and no more. That fails for the same reason from the
other side: besides the theme script, Next writes inline scripts that carry each page's data, they
differ on every page, and a hash for each cannot be put in one header.

So the policy uses `'unsafe-inline'` for scripts, as the third choice allowed, and is set in
`next.config.ts` for every path, with `'unsafe-eval'` added only in development. It still stops
everything that matters most for a site with one origin: no script, style, image, font or request
may come from another host, nothing can be framed, a form can only post here, a `<base>` tag cannot
redirect relative links, and plugins are off. What it does not stop is an inline script that an
attacker manages to inject. That risk is reduced by other means: React escapes what it renders, the
pasted chat and all AI output are treated as data, and every request body is validated. A unit test
checks the header and each directive, and an end-to-end test checks that no screen is blocked by it.

Moving to nonces would need pages that are rendered for each request, which means giving up
prerendering of the shell, or Next supporting nonces for prerendered shells. Experimental
Subresource Integrity (`experimental.sri`) puts integrity checks on script files but leaves the
inline scripts as they are. This record should be replaced if any of that changes.

### Two smaller changes

`GET /api/purpose-codes` reads a list that is written in the code, so it stays static and is the one
data route that does not call `connection()`. The contract now says so, and a test fails if any other
`GET` handler skips `connection()`, or if a route sets segment config (which fails the build with
Cache Components).

`GET /api/health` reports `offline`, and the contract no longer says that Dueline has "no offline
mode"; it says only that there is no service worker.

## Consequences

Anyone can run the whole product in two minutes with `npm ci` and `npm run dev:offline`, and a pull
request is checked by a real browser as well as by unit tests. The fake PayPal and the sample parser
are code to maintain: a change to what Dueline asks of PayPal must be mirrored in the transport, and
the end-to-end suite will say when it is not.

The policy allows inline scripts, which is the weakest line in the security story and is stated
openly. The accessibility result says that no serious problem was found by automated checks on six
screens, not that the app is accessible. The evaluation report is a measurement of one model on one
day; it should be rerun when the model or the prompt changes.
