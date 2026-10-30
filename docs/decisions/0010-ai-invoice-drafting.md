# 0010. AI invoice drafting

## Status

Accepted.

## Context

A freelancer pastes a client chat and wants an invoice. Gemini can read the chat and find the line
items, but its answer is a guess: it can misread a price, invent a quantity or follow an instruction
hidden in the chat. The chat also holds other people's email addresses and phone numbers.

Prompts sent on Google's free tier may be used by Google to improve its products. Both models we use
(`gemini-3.5-flash-lite` and `gemini-3.1-flash-lite` on this account) allow 15 requests a minute and
500 a day on that tier, and the app has to last the whole judging period on it.

## Decision

**The AI only drafts.** `POST /api/invoices/extract` returns an `InvoiceDraft` and creates or sends
nothing. The freelancer reviews it and clicks to create the invoice, as the money and safety rules
require.

**Contacts are masked first.** `maskContacts` replaces emails and phone numbers with placeholders
such as `[EMAIL_1]` before the prompt is built, and code puts them back afterwards. The model never
sees them, which also keeps them out of Google's free-tier data use. Money, dates and times are not
treated as phone numbers. An address the model returns that is not one of the chat's own is ignored,
because the model could only have invented it.

**Every field is re-checked in code.** The model's schema is deliberately loose, and
`checkModelDraft` turns it into a draft: the currency must be one we support, quantities whole
numbers from 1 to 999, prices positive with at most two decimals, the due date a real date that is
not in the past, and the purpose code on our list. Totals are never taken from the model. An item
that fails is dropped with a warning that names it.

**Quotes must match the chat.** The model gives each item the words it came from. If they are not
in the chat (ignoring case and spacing), the item is kept but flagged "not found word for word in
the chat", so the freelancer checks it. A price that does not appear as a number inside its own
quote is flagged the same way. Text inside the chat is data: the system prompt says so, the chat is
wrapped in `<chat>` tags with any tag inside it removed, and a price the chat does not support is
flagged by these checks instead of trusted. A chat with phrases that look like orders to an AI, such
as "ignore previous instructions", gets one warning to check every item, and the request still goes
through.

**Two models with a fallback.** `GEMINI_MODEL` is tried first. A 429, a 5xx, a timeout or a network
failure moves to `GEMINI_FALLBACK_MODEL` once, which has its own quota. An answer that does not match
the schema is not retried on the other model, and neither is an error such as a bad key that would
fail there too. Each call has a 20 second timeout and the SDK's own retries are off, so retries
are ours.

**Limits.** Each address gets 10 extractions an hour, counted with the store's rate limiter. The
whole app gets 400 model calls per Asia/Kolkata day, below the 500 a day Google allows, which leaves
room for the checks the developer runs by hand. Both counters only move when the model is about to
be called. An identical chat on the same day (SHA-256 of the masked text plus the date used for
"today") is answered from the store for 24 hours without a model call, and counts towards neither
limit. What is stored is the model's own answer with placeholders, not the finished draft, so no
contact details are kept and each chat gets its own email back.

**A hand-filled fallback.** When the models are unavailable, the allowance is used up or the chat
gives nothing usable, the route answers 503 `ai_unavailable` or 422 `extraction_failed` with a
message that says the invoice can still be filled in by hand. The New invoice screen must keep that
path working.

## Consequences

A wrong guess is caught by code or shown to the freelancer as a warning, and never reaches PayPal on
its own. The cost is that some honest items are flagged when the model paraphrases a quote.

The daily cap is for the whole app, so a busy day can lock everyone out of extraction until the next
Asia/Kolkata day. That is a deliberate trade for never running into Google's own limit.

The per-address limit tells people to try again in about an hour, because the rate limiter does not
report when a window ends.

The cache is kept in the store, so on Vercel it is shared between function instances. It needs
migration 003 (`npm run db:migrate`); until then the app works and simply calls the model each time.
