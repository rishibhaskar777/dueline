# 0011. Creating and sending invoices

## Status

Accepted. Builds on [0001](0001-own-idempotency.md).

## Context

One click on "Create and send invoice" must never produce two invoices, even after a double click,
a timeout or a crash between PayPal's answer and our database. PayPal's Invoicing API does not
document `PayPal-Request-Id`, and a create that times out leaves us not knowing whether the invoice
exists. Sandbox buyers are the only addresses PayPal's sandbox can email. PayPal's create body has
no switch for automatic reminders, and its list of invoices leaves out the memo, the items and the
payer link.

## Decision

**Claim before calling PayPal.** The route hashes the validated request (SHA-256 of its JSON with
sorted keys) and claims the request ID in our store. A completed request returns its stored result.
The same ID with another body is `duplicate_request`. A request still in progress is also
`duplicate_request`: "This invoice is still being created. Check Receivables before trying again."

**A memo marks the invoice.** Every invoice is created with the memo `dueline-request:<requestId>`,
which only the invoicer sees. An invoice can be found again from the request that made it.

**Recovery after two minutes.** A claim that has been in progress for more than two minutes was most
likely cut off. One caller takes it over: the store's `release(requestId, olderThanMs)` deletes the
claim only if it is still in progress and old enough, and only one caller can win that. The winner
claims it again, looks through the invoices (read in full, drafts included, through the same cache
the receivables page uses) for the memo, and finishes with the invoice it finds. Only when there is
none does it create one. If that lookup itself fails, the claim stays, so nothing is created blindly.

**What each failure leaves behind.**

- Nothing created (a PayPal 4xx, bad configuration): the claim is released, so the
  same request ID works once the user fixes the problem. A 4xx is `502 paypal_error` with PayPal's
  `debug_id`.
- Unknown (a timeout or a PayPal 5xx on create): the claim stays in progress. A timeout is
  `504 paypal_timeout`: "PayPal did not answer in time. Check Receivables before trying again."
- Sending fails after the draft exists: the draft is saved, the answer is `sent: false` ("Draft
  created, not sent"), and that result is stored, so a repeat never creates again. "Retry sending"
  calls `POST /api/invoices/{id}/send` with its own request ID. That endpoint reads the invoice
  first, sends only a draft, refuses a draft addressed to a non-sandbox buyer in demo mode, and releases its claim on any failure, so the retry re-checks PayPal.

**Create and send are separate PayPal calls.** The draft ID is stored before the send is tried.

**Discounts use PayPal's own invoice discount.** `amount.breakdown.discount.invoice_discount.percent`
takes the percentage off the invoice total. The due date becomes the earlier of the user's due date
and the invoice date plus `withinDays`, and the note says "Includes a 2% early-payment discount,
valid if paid by 6 Nov 2026", with that same earlier date, never a later one. PayPal has no discount that expires on its own, so the earlier due
date is what makes the window real.

**Automatic reminders are switched off for the account, not per invoice.** The create body has no
field for it. The developer turns them off in the sandbox business account's invoicing settings
(see CONTRIBUTING.md). Dueline sends every reminder itself, after a click.

**The demo buyer button.** While `DEMO_MODE` is on, `GET /api/demo/recipient` returns
`SANDBOX_BUYER_EMAIL`, and the review screen offers "Send to the demo buyer" to fill it in while
keeping the client's name. The server refuses any other recipient with `recipient_not_allowed`, before it claims the request
ID or calls PayPal; the send endpoint checks the draft's recipients the same way.

**A delivery date is not a payment date.** The extraction prompt uses `dueOn` only for stated payment
terms; with none, the draft's due date is today plus 14 days, with a warning.

## Consequences

A repeat of the same click is safe at every step, and a timeout costs the user at most two minutes
and a look at Receivables. The store gains one method, `release`. The recovery lookup reads every
invoice in full, which is acceptable for a demo account and would need a narrower query on a large
one. The shown total can differ by a cent from PayPal's when a discount does not divide evenly,
because the screen rounds half up and PayPal's rounding is not documented.
