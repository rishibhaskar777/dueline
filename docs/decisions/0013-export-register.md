# 0013. The export register

## Status

Accepted.

## Context

PayPal emails an Indian freelancer a Foreign Inward Remittance Advice (FIRA) each month for the
money it sent to their bank. The freelancer, or their chartered accountant, matches the FIRA with
their own records. Dueline's export register is that record: for a month, every invoice paid in it
with the foreign amount, PayPal's fee and net, the rupees received, the RBI purpose code, whether the
invoice was under a Letter of Undertaking (LUT) and PayPal's transaction ID, so each line can be
matched with the FIRA line by line.

Six things needed a decision.

## Decision

**Months are India months, so the paid time comes from the payment's timestamp.** PayPal's invoice
`payment_date` is a plain date in PayPal's own time zone. A payment made at 01:06 IST on 30 Oct
(19:36 UTC on 29 Oct) has `payment_date` 29 Oct, and an invoice paid at 02:00 IST on 1 Nov would land
in October. The register is for an Indian filer, so a month boundary must fall at midnight in
Asia/Kolkata. The Payments API capture has `create_time` and Transaction Search has
`transaction_initiation_date`, both timestamps. `getActualPayout` stores the one it used as `paidAt`,
and `toInvoiceSummary` takes `paidOn` as the Asia/Kolkata date of `paidAt`, falling back to
`payment_date` only when PayPal gave no timestamp. This also moves the receivables screen's paid
date, late days and "paid this month" total to the India date.

Payouts stored before this change have no `paidAt`. They are treated as stale once: the first read
finds the key missing, asks PayPal again (at most once every five minutes per invoice, as before)
and stores the new figures. If PayPal cannot be reached that time, the old payout is kept and
used. A payout PayPal gave no time for is stored with `paidAt: null`, and is not stale.

**Rupees are PayPal's when PayPal reports them, otherwise an estimate at the rate of the payment
date.** `netInr` is used when PayPal reports a conversion, rounded to whole rupees. Otherwise the
register converts PayPal's net (or, with no PayPal figures at all, the estimate from the published
fees) at the ECB rate of the payment date less the settings' markup, and marks the row "estimate"
with the rate and its date. The ECB's rate on the payment date is the right one for a record of that
payment; today's rate would change every day the register is open.

**Historical ECB rates are fetched once per date.** Frankfurter's `date` parameter returns the
rates for that date or for the latest working day before it. `getRatesOn(date)` stores the answer in
the store's existing cache (a year's expiry, since a past rate does not change) so each date is
fetched at most once, and no migration is needed. It reports the date the ECB's rates are for
(which can be earlier than the date asked for) and their source. Today's date and later, and the
"my own rates" source, use the rates already in use, and so does a failed fetch.

**The transaction ID is PayPal's payment ID.** The invoice's payment ID is the ID of the capture,
and it is the transaction ID PayPal prints on its transaction history and the FIRA. The register takes
it from the stored payout when PayPal's figures were found, and otherwise from the invoice's own
latest payment (`payments.transactions[].payment_id`), so every paid row has one to match. It is
empty only for an invoice with no payment ID at all.

**A CSV for the accountant must not run as a program.** A spreadsheet treats a cell that starts with
`=`, `+`, `-`, `@`, a tab or a carriage return as a formula, and a client name comes from a PayPal
payer or an AI draft. `toCsv` puts a single quote in front of such a text cell. The file is quoted as
RFC 4180 (comma, quote, CR and LF force quotes, and quotes are doubled), has CRLF line ends, and starts
with a UTF-8 byte order mark so Excel reads names correctly. Money is a plain decimal and rupees an
integer, with no symbols.

**A partly paid invoice is left out.** A part payment has no single paid date for the whole
invoice, and Dueline would have to guess how to split the amount between months. The register lists
invoices that are paid or marked as paid; a partly paid one appears in the month it is paid in full.
An invoice with no dated payment has no paid date and is left out as well.

## Consequences

The register's rupees can differ from the FIRA for estimated rows, and the screen says which rows
those are and how they were worked out. PayPal's figures are rounded to whole rupees, so a row can
differ from the FIRA by under one rupee. Every register read loads the invoice list (cached for 20
seconds) and asks for a rate at most once per distinct paid date that needs one. A month with
many estimated rows makes that many first-time requests to Frankfurter, and none afterwards.
