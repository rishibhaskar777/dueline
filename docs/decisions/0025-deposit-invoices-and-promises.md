# 0025. Deposit invoices, a printable tax invoice and a currency guard

## Status

Accepted. The deposit invoices, the printable invoice, the currency guard, the heads-up reminders and
the promised dates are built. The rate range is recorded as the intended design and is not built yet
(see the last section).

## Context

A freelancer who tested the demo named what would make them pay: ask the client for part of the money
before starting, give a client or a CA a PDF with the GST details, and stop a wrong currency from
reaching a client. The chat often says "50% now and the rest on delivery", which Dueline only showed as
a notice.

## Decision

**Two invoices, not partial payment.** PayPal Invoicing v2's `partial_payment.allow_partial_payment`
is not available for invoices in India, so a deposit cannot be a payment against one invoice. Dueline
makes a deposit invoice, sent now, and a balance invoice, saved as a PayPal draft and sent by the
freelancer on delivery. Each is a complete invoice for its own value, with one line, the SAC and
purpose code of the draft, and no negative line or discount, so the export register and GSTR-1 count
each once and a CA reads two ordinary invoices. The deposit amount is the percent rounded to the cent
and the balance is the rest, so they always add up. The balance's note names the deposit invoice and
lists the whole job, so the client can match them. A shared id in both memos links the pair; memos
without it are read as before.

**Drafts stay hidden, except balance drafts.** A draft is not money owed, so it never counts in a
total, a forecast, the risk radar or the register. Only a balance draft is shown, in Ready to send on
Home and on its own page, and only by an explicit click is it sent, through the existing send route.
The deposit's request ID names the pair, and the balance has its own request ID, so a failed balance
can be retried alone without a second deposit.

**A printable invoice from the browser.** The page `/invoices/{id}/print` is styled for A4 with print
rules, so the browser makes the PDF and no library is added. It prints only what the invoice page
reads, plus an optional business address from the profile, and it adds the LUT export
endorsement of Rule 46, or a warning in its place when the invoice is not under LUT
([export-invoice.md](../export-invoice.md)).

**A currency guard that only asks.** A small tested module compares the chat's money words with the
form's currency, on the form and again in `check-draft.ts`, so a model cannot skip it. It offers a
button and never changes the currency itself.

## Consequences

- A freelancer can take a deposit through PayPal in India today, at the price of two invoice numbers.
- The balance is dated again when it is sent: Dueline replaces the saved draft through Invoicing v2's
  full update, with the invoice date set to the sending day and the same number of days to pay. If
  the update fails the balance is not sent.
- Reading drafts in full on every snapshot costs one cached PayPal read per draft.
- The print page does not calculate tax. An invoice not under LUT prints a warning that integrated
  tax must be shown, to be added with a CA, instead of an endorsement that would claim tax the page
  does not show.

## Built after the first release

- **Promised dates.** A client's promise to pay on a date pauses new reminder drafts for that invoice
  until the day after the date, because a reminder sent between a promise and its date asks for what the
  client has just agreed to do. The freelancer notes the date (today to 60 days ahead, India time, with an
  optional note) on the late invoice's Nudges card or its invoice page. While it is ahead the morning run
  writes nothing for the invoice, the card shrinks to "Promised for 10 Nov" with "Remind anyway", Home shows
  "Promised 10 Nov" under the status and a marker on the due line, and the invoice page shows it in its
  facts and history. The day after, if the invoice is unpaid, the card is normal again with Firm suggested
  and the reason "promised 10 Nov, still unpaid", and the late-payer radar's reason says "Missed a promised
  date once" without changing its level rules. Paying or cancelling the invoice, and a demo reset, end the
  promise. It lives in its own table, `payment_promises` (migration 011), one row per invoice, and is put
  on the invoices when they are read, so it needs no change to the stored snapshot.
- **Heads-up reminders.** A friendly note before the due date, never mentioning lateness, in a tone of
  its own (`heads_up`) lower than Gentle. Nudges lists the invoices that fall due within the profile's days
  (1 to 7, default 3) in a "Due soon" section above the late ones. The draft goes through the same pipeline
  as a late reminder, with a check that refuses any word of lateness, in every language, and a template in
  each of the seven languages. It is sent once per invoice, through PayPal's reminder or the freelancer's own
  email, logged in `reminder_log` with the new tone (so migration 011 widens that table's check on the tone
  column, the one non-additive statement in it) and recorded as an activity row. A heads-up already sent
  does not make the first late reminder firm.

PayPal's documentation of `POST /v2/invoicing/invoices/{id}/remind` states no restriction on the due date
or the invoice's status, and the offline simulation accepts it, so both channels are offered on a
heads-up card. It has not been tried against the sandbox, so a refusal is handled: any 4xx answer to a
heads-up reminder (not 429, which stays the daily limit) is not logged or counted, the card says "PayPal
only sends its reminder once an invoice is due. Use Send my message." and hides the PayPal button for that
invoice for the rest of the India day, which is kept as a day-keyed cached value in the store. The offline
fake can be made to refuse (`refuseReminders`), which is how the tests cover it.

## Not built yet

- **The rate range.** The honest line is a range of the last 30 days' rates, not advice to send
  sooner: PayPal converts when the client pays, so the freelancer cannot time it by sending.
