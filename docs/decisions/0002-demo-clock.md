# 0002. A demo clock

## Status

Accepted.

## Context

Dueline's value shows when invoices are late, but sandbox invoices are created today and are not
late today. We do not want to fake PayPal data to make the demo work.

## Decision

When `DEMO_TODAY` is set, every due-state, overdue and risk calculation uses that date as today. All
code gets the date from `src/lib/clock.ts`. PayPal data stays real. The UI shows a small "Demo date"
label whenever the demo clock is on, and `GET /api/health` reports `demoClock: true`.

## Consequences

Real sandbox invoices can appear overdue in the demo. Nobody can mistake the demo date for the real
one, because the label is always shown. Code must never call `new Date()` for business dates.
