# 0015. The demo story and its reset

## Status

Accepted.

## Context

The late-payer radar needs history, and a judge opening the demo should see a Reliable, a Watch and
a Late payer client for real reasons, not four invoices with nothing behind them. A judge or the
developer also needs a way back to that state after trying the app, without a terminal.

## Decision

**A seeded story with real sandbox history.** `src/lib/demo/story.ts` lists eight invoices to five
clients with every date as a day offset from `today()`, so the story is fresh whenever it is created
and follows `DEMO_TODAY`. Okafor & Reyes paid two older invoices 12 and 16 days late and is late
again, so it is a late payer. Brightwell Labs paid one invoice 6 days late and is 3 days late now,
which is a watch (a fifth overdue day would make the average 5.5 and a late payer). Halden Coffee Co.
paid 2 days early and is reliable. Northpine Studio and Tandem Health keep their open roles. The
invoices are real PayPal sandbox invoices, so every screen reads them like any other.

**History is recorded as payments made outside PayPal.** A sandbox buyer cannot pay a past invoice on
a past date. PayPal's `POST /v2/invoicing/invoices/{id}/payments` with `type: EXTERNAL` and a
`payment_date` marks the invoice `MARKED_AS_PAID` on the date we choose. Such an invoice has no
capture, no PayPal fee and no FIRA line, so Dueline gives it no actual payout, estimates its rupees
and counts it in the risk score like any paid invoice. The export register lists it by number after
the table and leaves it out of the rows and the rupee totals (see
[0013](0013-export-register.md)).

**Memo markers make seeding idempotent.** Every story invoice carries the memo `dueline-demo:<key>`.
`seedDemo` reads the invoices in full (the list leaves memos out), creates and sends only the keys
PayPal does not have, and records the payment for history invoices. A story invoice left as a draft
or sent but unpaid by a failed run is finished next time; a cancelled one is created again; one the
client paid through PayPal is left alone. One failure does not stop the others.

**Reset touches only what the demo created.** `POST /api/demo/reset` (demo mode only, otherwise
`404 not_found`) cancels every sent or unpaid invoice that is not part of the story, without emailing
anyone, deletes every draft, runs `seedDemo` and clears the invoice caches. It never touches paid,
marked-as-paid or partly paid invoices, so a real sandbox payment made during the demo stays. It logs
counts only. The response reports `failed` as well as the four counts in the original contract, so a
partly restored story is not shown as a success.

**One reset every ten minutes for the whole app.** Reset makes dozens of PayPal calls and the
sandbox is shared, so the store's rate limit allows one run per ten minutes and a refused caller is
told how many minutes remain. The limit is counted before the work starts, so a failed reset also
waits; running it again is safe because every step is idempotent.

## Consequences

The story needs `SANDBOX_BUYER_EMAIL`. A sandbox seeded by the earlier `npm run seed` holds
invoices without memos: reset cancels the open ones as "not part of the story" and creates the new
set, while running `npm run seed` alone would add the story beside them. Seeding is sequential
(PayPal hands out invoice numbers in order), so a full first run takes tens of seconds.
