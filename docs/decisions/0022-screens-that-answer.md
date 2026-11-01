# 0022. Screens that answer their question

## Status

Accepted.

## Context

Judges looked at the screens and found small gaps: the invoice table hid its own page link behind a
"Details" column that pushed PayPal off a laptop screen, a client's risk badge cut off the name, the due
line's end labels ran into the Today line, the late-payer radar and the discount control were two things
doing one job, the export register opened on an empty month, and the Nudges card showed a message that
the freelancer could not see as the client would.

## Decision

**Table links.** The invoice number is the link to the invoice page (keyboard reachable, named "Open
invoice 0011") and the "Details" column is gone. PayPal is an icon link, named "View invoice 0011 on
PayPal (opens in a new tab)", with its word shown on hover and focus. The risk badge sits under the
client's name in the same cell, a two-line row, so a long name keeps its width. The grid fits its
columns to the width the page gives it (`fitGridWidth`, with a minimum per column), which keeps all
eight columns visible at 1366 px.

**One discount control.** The early-payment discount section is the only control. The radar's button
fills and switches it on through one hook, `useDiscountOffer`, and once the section holds the suggested
figures the button gives way to a line saying so. The radar sits directly under the Client card.

**Label placement.** An end label on the due line goes to the right of its dot. If that would touch a
vertical mark (the dashed Today line or a due tick) or run off the axis, it goes to the left of the dot,
above the line; if neither side is clear it is nudged down below the line. This is a pure function
(`placeEndLabel`) of pixel positions, so it is tested without a browser. A line that begins before the
chart's first date gets a small left arrow and "Sent 17 Aug" in its tooltip. Every row shows its invoice
number.

**Merges are aliases.** Merging a client into another stores an alias from one client key to the other,
with the merged client's name and email, in `client_aliases` (migration 009). After PayPal's invoices
are loaded, the invoices of a merged client take the other client's name, so every grouping rule (risk,
client summaries, the forecast, late clients, search, reminders and the radar) sees one client with no
second code path. Their email stays their own, so nothing is ever sent to the wrong address, and PayPal
is never changed. Each rewritten invoice carries `mergedFrom`, the name on the PayPal invoice, so a client's own country and email come only from its own invoices and a merged client's invoice never replaces them; a merged client's risk reading always says how many invoices it rests on. There are no chains: a client that was merged away cannot be a target, and one that
others were merged into cannot be merged away. The merged client's page is gone while the merge stands;
it is undone ("Unmerge") from the page of the client it went into.

**The preview is approximate.** The Nudges preview shows the personal email as "Send my message" will
fill it, built from the same body as the mail, Gmail and copy links, so it cannot say anything those do
not. Email apps lay a message out their own way, so it is a faithful preview of the words and an
approximation of the look. PayPal's own reminder is a different email in PayPal's wording, and the panel
says so.

**The checklist.** A first-run card on Receivables ticks itself from saved data: business profile,
LUT ARN, a first invoice made through Dueline, reminders prepared each morning, and a first export
register download. The download is remembered in the store when the CSV is served (`app_flags`, also in
migration 009), so it ticks for the freelancer rather than for one browser. When everything is done it
says "All set" and can be hidden for good, which is also remembered in the store. Like the other widgets
it can be hidden with Customise.

**The register opens where the payments are.** When the current month has no paid invoices and an
earlier one does, the register opens on the latest month with payments and says so. Choosing a month
yourself is always respected. The CSV for the CA is off, with a reason, for a month with no rows; the
GSTR-1 file lists invoices issued in the month, which the register does not know, so it stays on.

## Consequences

- A merged client's invoices show the other client's name in Dueline's screens while the PayPal invoice
  keeps its own.
- Nothing about the colours, page widths or card layout changed; the sidebar's spacing is tighter and
  its scrollbar track is hidden if a very short screen still overflows.
