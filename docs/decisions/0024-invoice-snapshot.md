# 0024. A stored snapshot of the PayPal invoices

## Status

Accepted.

## Context

Judges open the live demo after it has been idle. Home and Nudges took seconds to fill: the invoice
list and every full invoice read were cached only in the memory of one function instance, and on
Vercel a new or cold instance starts empty. `GET /api/invoices` then listed the invoices in PayPal
and read each one in full, four at a time, at about a second each. Measured from India, the first
Nudges visit took 6.9 s for the invoices and 9.0 s in all; the same endpoints answered in 145 to
195 ms once warm. Navigation itself was fast, so the cost was the data.

## Decision

**Keep PayPal's invoices in the store.** The last good set of full PayPal invoices, each with the
payout figures found for it, lives in `cache_entries` under one versioned key (`invoices:snapshot:v2`),
with the time it was built. No new table or migration is needed. Every full PayPal invoice is kept
there too, by ID, with a change mark. A value that does not parse reads as missing, and the version
changes with the shape. No token or credential is stored.

**Stale while revalidate.** A read answers from the snapshot at once. When it is older than 60
seconds the read starts one refresh with `after()`, so it runs behind the response. A refresh lists
the invoices (one call) and reads in full only the new ones and those whose mark changed. PayPal's
list has no update time, so the mark is the status, amounts, dates, memo, note and recipient from the
list entry. A failed refresh keeps the old snapshot.

**Exact after a write.** Create, send, cancel, record payment, reminders, the webhook handler, the
demo reset and re-seed and the daily run wait for `refreshSnapshotNow(ids)`, which reads the named
invoices again, and run it even when the PayPal call fails, since the write may have happened. If
the refresh fails the snapshot is dropped, so no read can show what is known to be old.

**The date is not part of the snapshot.** The summaries (due state, days late, amount due, LUT, SAC,
payment ID) are worked out from the stored invoices on every read, with that read's India date. A
snapshot built yesterday is served at once with today's states and refreshed in the background, so
a missed daily run costs nothing. The work is under a millisecond for the demo's invoices. Rupee
figures stay outside the snapshot, as before.

**The browser asks once.** Reads of the same address that are still on their way share one request,
the profile and the demo buyer are read once for the page, and Home and Nudges draw each part as it
arrives. Opening a screen again shows its last answer while the new one loads, but any write, sign-in
or sign-out (locking the demo) forgets every remembered answer and the reads still on their way, so
nothing seen before a change is shown as current after it. Invoices older than five minutes show
"Updating from PayPal…".

## Consequences

- After idle, the first request needs no PayPal call when a snapshot exists, and a refresh makes one
  list call plus a read per changed invoice instead of one per invoice.
- A change made in PayPal itself shows within about a minute (the next read after 60 seconds, then
  the refresh), or at once when the webhook arrives. A write made through Dueline shows on the next
  read.
- Only the first request ever, or the first after a failed refresh dropped the snapshot, builds from
  PayPal.
- If the list shows no change but an invoice changed (for example a note edited in PayPal), it is
  read again after 6 hours at the latest.
- The snapshot holds the invoices and client emails, as the database already does; it is never
  logged and expires after seven days.
- A change to what the snapshot stores (not to `LoadedInvoice`, which is built on read) needs the
  key's version (`v2`) to change so old snapshots are not read.
- An invoice PayPal stops listing leaves the snapshot at the next refresh, and its stored full copy
  is dropped.
