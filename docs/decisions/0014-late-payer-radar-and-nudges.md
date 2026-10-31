# 0014. The late-payer radar and nudges

## Status

Accepted.

## Context

Dueline helps a freelancer in two ways when a client pays late. Before the next invoice it should
say which clients tend to pay late and suggest an early-payment discount. After an invoice is
overdue it should draft a polite reminder that the freelancer edits and approves, and PayPal sends.

Seven things needed a decision.

## Decision

**The score and its reason come from code, not from AI.** `scoreClient` is a pure function of a
client's invoices and today's date. A client's invoices that are paid or overdue are considered; an
invoice that is open and not yet due says nothing. A client is `reliable` with no late invoice or
when every late one was 2 days late or less, a `late_payer` with at least two late invoices
averaging 5 days or more or any invoice more than 30 days overdue, and otherwise `watch`. The
reason is a sentence built from the numbers ("Okafor & Reyes paid 2 of 3 invoices late, 14 days on
average."). A model would cost a call per client, could misstate a number and adds nothing a
template cannot say. The rules are easy to test and to explain to the freelancer.

**A client is the pair (normalised name, email).** In the demo every invoice goes to the same
sandbox buyer, so the email alone would merge every client into one. Names are compared after
trimming, collapsing spaces and ignoring case. `GET /api/clients/risk` takes an optional `name`;
without it, every invoice to the email counts.

**The suggestion is fixed by the level.** A late payer gets 2% for payment within 7 days, a client on
watch 1%, a reliable client none. The review screen shows it as a button that fills the discount
fields; nothing is applied without a click. The suggestion is inside PayPal's own discount range
(1 to 20%, 3 to 30 days).

**Tones follow how late the invoice is and how often the client was nudged.** Gentle for 1 to 7 days
late with no reminder sent, firm for 8 to 20 days or after one reminder, final beyond 20 days or
after two. The freelancer can switch tone; the suggested one is marked.

**AI drafts are checked in code, with a template as the fallback.** Gemini writes the subject and
message from facts Dueline gives it (client name, invoice number, amount, dates, days late, the
work). Its answer is untrusted: code requires a subject of 5 to 120 characters and a message of 20
to 900, the invoice number present, every money amount equal to the invoice's, and no links or email
addresses. Anything else, an unavailable model or the app's daily allowance being used up gives a
template written in code, and the draft says which it is (`source`). A client with no business name
is known by email address, which is never sent to the model or written into a template. The same
text rules apply again when the freelancer sends, because the text may have been edited. The
client's business name and the work description are removed before links are looked for, since a
client called "Acme.io" would otherwise fail every draft; for the same reason the send route checks
links once it has read the invoice, not in the request schema.

**PayPal sends the reminder, with its own payment link.** `POST /v2/invoicing/invoices/{id}/remind`
emails the client from the freelancer's account with the invoice and its "Pay now" button, so the
client hears from one voice (Dueline's invoices already switch off PayPal's automatic reminders)
and Dueline never writes a link of its own. The message says only that the PayPal email has a Pay now button.

**Limits.** PayPal allows two reminders a day per caller and answers 429 beyond that; Dueline
releases the request ID and says so. Dueline also allows at most one reminder per invoice per India
day, counted from its own reminder log with the real clock, since PayPal's limit is in real time and
the demo date is not. Drafting is capped at 20 model drafts an hour per address and shares the app's
400 model calls a day; drafts are cached for 24 hours per invoice, tone and days late.

## Consequences

The radar needs no model and works offline from PayPal's data, but it judges only what PayPal shows:
a client who pays on time but is invoiced rarely is "reliable" with little evidence, and the reason
says how many invoices it rests on. Clients are separated by the name on the invoice, so the same
client invoiced under two spellings is two clients. Every nudges screen load reads the invoice list
(cached for 20 seconds) and may call the model up to ten times, two at a time; repeat loads are
served from the cache. A reminder that PayPal refuses for its daily limit can be sent again the next
day.

## Update: tone follows the client's record, and clients are matched by name or email

**A late payer is chased one step firmer.** `suggestTone` takes the client's risk level: `late_payer`
moves the suggestion up one step (gentle to firm, firm to final); `watch` and `reliable` leave it.
The user can still pick any tone, and the card says why the suggestion is firmer ("Suggested firm
because Okafor & Reyes is a late payer.") so the rule is never hidden.

**Few invoices say little.** The screens add "Based on N invoices." to the reason when N is below 4,
because one more late payment could change the reading.

**Who is the same client.** Matching on the pair (name, email) split a client who changed their
billing email into two, so a pasted chat for "Brightwell Labs" with a new address showed no history.
Invoices now belong to one client when the normalised business name matches **or** the email
matches. In demo mode every client shares one sandbox buyer email, so only the name counts there.
Without a `name` in the query the email decides, as before. This also means the same business under
two spellings is still two clients; the email joins them outside the demo.
