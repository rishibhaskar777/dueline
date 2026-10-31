# 0017. The money views

## Status

Accepted.

## Context

In the user test a freelancer asked four things Receivables could not answer: what will reach my bank
next, what does getting paid cost me, what do I know about this client, and what has happened to this
invoice. They also wanted to hide what they never look at.

## Decision

**A forecast that says how it is made.** Each unpaid invoice is expected on its due date plus its
client's average days late (nothing for a reliable client). An overdue invoice is expected today plus
the days the client is usually late beyond the days already late, and never sooner than 3 days away.
Its rupees are weighted by risk: reliable 0.95, watch 0.85, late payer 0.7, and 0.5 for any invoice
more than 30 days overdue. A client with no history is weighed like one to watch, with no delay.

These weights are judgement, not statistics. Four invoices cannot estimate a probability, and the
numbers were chosen to be cautious and easy to explain. The screen therefore says what it does
("Weighted by each client's payment history. Best case assumes everyone pays on time.") and shows the
best case next to the expected figure, so the gap between them is visible. The best case counts the
full rupees of every invoice by its due date (today when it is already overdue). It is not a promise
either: it assumes nothing is disputed. Beyond 90 days nothing is forecast.

**Fees lost counts PayPal payments only.** It reuses the annual summary for the current Indian
financial year: PayPal's fees plus the conversion loss, over invoices paid through PayPal. Where
PayPal did not report a fee or the rupees, the annual summary estimates them from the published fees
and the ECB rate, and the widget says so. A payment
recorded outside PayPal pays no PayPal fee and suffers no conversion loss, so counting it would make
the figure look better than it is. "Lost per ₹100" is the loss over the market value of those
payments (what was received plus what was lost), which is the same ratio the payout estimate calls
`lossPercent`.

**Rates are context, not alerts.** The widget compares today's ECB rate with the 30-day average,
fetched from Frankfurter once a day and kept in the store's cache. When the history cannot be read, or
the freelancer uses manual rates, it shows today's rates and says the average is missing. Nothing
notifies anyone in this step.

**Clients are the radar's groups.** The client list, a client's page and their risk reading all use
the late-payer radar's one rule for who is the same client, so they cannot disagree. The key in the
address is the client's name turned into letters, digits and hyphens. The client routes and the page sit
under `by-key`, so a client called "risk" or "new" cannot collide with a fixed route such as
`GET /api/clients/risk`. Notes are private text in their
own table (migration 005), keyed by that key, never logged and never sent to the AI.

**The invoice page reads PayPal's metadata, Dueline's reminder log and the activity feed.** Cancelled
and draft invoices have a page too, because "what happened to it" matters most for them.

**Actions that exist, and why.** The page offers only what the invoice's status allows, and the server
checks the same rule, so a stale page cannot do harm.

- _Send a reminder_ links to the invoice's card on Nudges. Reminders keep one place, with their tone
  choice, their limits and the freelancer's review.
- _Duplicate_ opens New invoice filled with the client and items. The due date, note and discount are
  chosen again, and the form gets a new request ID like every form.
- _Record a payment outside PayPal_ marks the invoice as paid in PayPal (type `EXTERNAL`). It then
  counts under the one rupee rule as "outside PayPal". It sends nothing to the client.
- _Cancel invoice_ cancels in PayPal. **It does not email the client by default.** Cancelling is often
  housekeeping, such as a wrong amount or a duplicate, and an unexpected "your invoice was cancelled"
  email to a client can cause more confusion than the invoice itself. Emailing is a separate, ticked
  choice, and in the demo it goes through the recipient guard like every other message.

Both writes use a request claim, clear the invoice caches, release their request ID when PayPal
refuses, and answer `409 invalid_state` for an invoice whose status does not allow them.

**The Receivables layout belongs to the browser.** Which widgets show, and in what order, is kept in
`localStorage` under `dueline.layout.v1`. There are no accounts, so there is no one to attach a server
setting to, and a shared deployment should not let one visitor rearrange another's page. The cost is
that the layout does not follow the freelancer to another browser. Storage can be unavailable, so
every read and write is wrapped, a saved layout is validated on read (unknown widgets dropped, new ones
added), and the page renders the default layout when there is none. Reordering uses Move up and Move
down buttons, which work with a keyboard and need no drag library.

## Consequences

- The forecast will be wrong whenever a client behaves unlike their history. It is labelled, not
  hidden, and the weights are constants in one file that can change in a later decision.
- A client who changes their invoiced name becomes a new client, unless their email identifies them
  outside the demo.
- Two names that differ only in punctuation ("A&B" and "A B") share a key, and the page shows the first.
  A name with no letters or digits has no usable key.
- Notes are not removed when a client has no invoices left; they simply cannot be reached.
- The dashboard is read in one request, so one failing source (PayPal) fails every widget together.
