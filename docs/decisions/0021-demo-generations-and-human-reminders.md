# 0021. Demo generations, and reminders that read like a person

## Status

Accepted.

## Context

The demo story is dated from the day it was seeded. A judge opening it a month later saw invoices that
were weeks overdue, an empty "paid" total, an Activity feed that said an August invoice was sent "17
hours ago", test invoices from PayPal's dashboard on the due line, and reminders that contradicted their
own tone ("This is our last reminder" at 8 days late, "Friendly reminder" on a firm card), written as one
block of text. A chartered accountant opening the export register saw no bank transfers at all, because
they were counted outside it.

## Decision

**Generations.** The store keeps the current story generation: an id and the day it was seeded. A
reset starts the next one and seeds the whole story dated from that day. Story invoices carry
`dueline-demo:<generation>:<key>`; one made before generations existed has no generation and counts as
generation 0, which is why a demo that has never been reset keeps showing the story it has. The open
story invoices of older generations are cancelled. The paid ones cannot be removed from PayPal, so they
stay there and the visibility rule decides what is shown.

**One visibility rule.** `isShownInDemo` is the only place that decides what a demo screen or export
shows: the current generation of the story; invoices made through Dueline's create flow; and any invoice
paid through PayPal (status `PAID`), whatever its marker or generation. Everything else is hidden:
invoices without a Dueline marker, older generations that were not paid through PayPal, cancelled
invoices and invoices the owner hid. The paid rule does not need a marker because the early sandbox
scripts made real payments (Tandem Health $900, the $100 sandbox check) before every invoice carried
one, and hiding them told a judge that nothing had come through PayPal. A payment recorded outside
PayPal (`MARKED_AS_PAID`) is not that proof and still follows the marker rules. Every list (Receivables, the due line, Clients, the radar, the
forecast, fees lost, the register, GSTR-1, the year summary, Activity, search, the digest, the reminder
drafts) loads its invoices through `loadVisibleInvoices`, so risk scores and totals are computed from the
same set the screen shows.

The trade-off: a real payment made against an old story invoice stays in the history, so the demo can
show an invoice from a generation that is otherwise gone. That is deliberate. Dropping it would hide
money that moved, and a judge who paid an invoice would see it vanish. The cost is that a client's
history can mix generations; the rule hides only what is not proved by a real payment. A hidden invoice
is not deleted and still opens by its link, which is how it is shown again.

**A weekly re-seed.** The daily run starts a new generation once the current one is 7 days old. It only
cancels open story invoices of older generations, never any other invoice, and it waits for the same
ten-minute slot as a manual reset, logging a skip when the slot is taken. A demo that has never been
reset has no generation to age, so the run leaves it alone until someone presses reset once.

**The queue and the morning card follow the shown invoices.** A reset cancels invoices, so a queued
reminder or a stored digest could name one that no longer exists. Reading the queue now checks every
reminder item against the shown invoices and deletes the ones whose invoice is not shown, is paid or
is no longer overdue, so Nudges, the count and the morning card agree. A new generation (a reset or
the weekly re-seed) clears the queued reminders; retainer items belong to a schedule, not to the
story, and stay. The digest is no longer stored: it is worked out from the shown invoices and the
cleaned queue each time, so it cannot hold an invoice number that has gone stale.

**Averages are shown in whole days.** The exact average stays in the data; every sentence and figure
that shows one ("12 days on average") uses the one helper in `src/lib/format-days.ts`.

**Seeded history is honest.** Seeding writes the story's own activity rows (`sent`, `paid`) on the
story's dates with fixed ids, so a later webhook for the same invoice and kind reuses the row rather
than adding a second. Activity moves rows already stored with the real time onto the story's dates when
it reads them, so no data migration is needed. One gentle reminder for the Okafor & Reyes "Website
copy" invoice is written to Dueline's own reminder log at its story date. It is history of a made-up
freelancer, kept in Dueline's log only; nothing is sent to PayPal, and it gives the invoice page and the
client's record a real reminder to show. It is not on the invoice that is overdue now, so the tone rule
below still sees no reminder for it.

**Tones and their facts.**

| Days late | Reminders sent | Client     | Suggested tone |
| --------- | -------------- | ---------- | -------------- |
| 1 to 7    | 0              | any other  | gentle         |
| 1 to 7    | 0              | late payer | firm           |
| 8 to 30   | 0              | any        | firm           |
| any       | 1              | any        | firm           |
| any       | 2 or more      | any        | final          |
| over 30   | any            | any        | final          |

A late payer starts at firm but never goes straight to final: final is for an invoice that has already
been chased twice or is more than a month late. Each suggestion carries its reason in words ("Suggested
firm: 8 days late, and late on 3 of 3 invoices."), and the Nudges card and the Today queue show the
same text.

**Paragraphs.** The model is asked for a greeting line and two or three short paragraphs. A pure
normaliser then runs on every message, whatever wrote it, and puts the greeting on its own line and
splits any block of more than two sentences into paragraphs of one or two. A message from the model, a
template or the cache is the same shape.

**Tone check.** A draft whose words contradict its tone (a firm message that says "gently", a gentle one
that says "last reminder", and the equivalents in each reminder language) is replaced by the template
for that tone, and the log names the phrase without anything from the invoice. The cache is read through
the same check, so an older draft is never reused under a tone it does not fit.

**Why Brightwell's draft read gentle.** A queued item stores no tone and no text, and the card and the
queue take the tone from the same function; the only way a card labelled firm could carry a gentle draft
is the model ignoring the tone. The prompt called every message "friendly" whatever the tone, and
nothing checked the answer. The prompt no longer says it, the tone check rejects the draft, and a draft
that fails is redrafted from the template when the card opens.

**PayPal does not send our words, so Nudges has two channels.** PayPal's Invoicing v2 documentation
for [sending a reminder](https://developer.paypal.com/api/invoicing/v2/invoices-remind) (and for
sending an invoice) says a user-provided `subject` or `note` "will not be honored" and is replaced
with a system-defined value. Dueline had been drafting, editing and "sending" a message that PayPal
discarded. Nudges now says what happens. "Send PayPal reminder" asks PayPal for its standard reminder
and sends none of our words (the card says PayPal writes the wording); the daily limit, the
idempotency claim and the log are unchanged. "Send my message" opens the freelancer's own email
(`mailto:`, Gmail, or copy) with the drafted subject and message, to the client, and the invoice's
pay link as the last paragraph, so the client reads the words the freelancer approved and still has
a way to pay. The pay link is added in code after the link check, so it is the only link a message
can hold. Nothing is recorded by opening or copying; the freelancer confirms with "I sent it", which
logs the reminder with channel `email`, because Dueline cannot see an email it did not send. The
reminder log keeps the channel (default `paypal`), both channels count towards the tone of the next
reminder and the one-a-day rule, and only PayPal reminders count against PayPal's two a day.
Activity says "Reminder sent through PayPal" or "Message sent from your email". The invoice send call
no longer sends a subject or note either; what the client sees on the invoice itself (its note,
terms, LUT line) is part of the invoice and is unaffected. In demo mode the client's address is the
sandbox buyer, so "Send my message" goes there, and the card says so.

**Bank receipts are export proof.** A payment recorded outside PayPal is a bank transfer, and a bank
transfer has its own proof: the bank's FIRC or e-BRC. The register lists these as `outsideRows` with the
number the freelancer adds (kept in `bank_receipts`), and the CSV for the CA has a `Proof` column that
says `PayPal FIRA`, `Bank FIRC/e-BRC <number>` or `Bank, reference missing`. The totals keep PayPal FIRA
rupees and bank rupees apart and report both together, so the PayPal total can still be matched to
PayPal's monthly FIRA. The GSTR-1 export (by issue date) and the year summary already counted these
invoices and now read the same visible set.

## Consequences

- A migration (008) adds `demo_generation`, `demo_hidden_invoices` and `bank_receipts`.
- A story invoice from before this change is generation 0 until the first reset after it is deployed;
  the first reset starts generation 1 and the earlier open ones are cancelled.
- `ExportRegister.recordedOutsidePayPal` is replaced by `outsideRows`, `paypalFiraInr` and `bankInr`.
- The final tone's template says "final reminder" or "last reminder" only after two reminders have been
  sent. Reached by being more than 30 days late with fewer, it asks for payment within 3 days or a
  date, in every language, without calling itself the last word; the tone check rejects a model draft
  that does.
- `reminder_log` gets a `channel` column in migration 008 (008 was not applied yet, so it is part of
  that file).
