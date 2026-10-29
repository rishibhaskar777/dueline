# 0006. Storage

## Status

Accepted.

## Context

PayPal holds the invoices, so Dueline keeps little of its own: request IDs for idempotency, webhook
event IDs, a short activity feed, reminder history, settings, rate-limit counters, daily exchange
rates and PayPal's payout figures for paid invoices. It must cost nothing and need no credit card.
Anyone should also be able to run it without setting up a database.

## Decision

Use Postgres on Neon's free plan through the `postgres` package, in the same region as the web
service. When `DATABASE_URL` is not set, use an in-memory store with the same `Store` interface.

Neon's pooled connection string goes through PgBouncer, which cannot keep prepared statements, so
the client is created with `prepare: false`. It also uses `max: 3`, `idle_timeout: 20` and
`connect_timeout: 10` to stay inside the free plan's connection limits and to fail fast. SSL comes
from the URL. All queries are tagged templates, so every value is a parameter.

Stored: request IDs with a hash of the body and the stored result, webhook event IDs, activity
events, reminder history, settings, rate-limit counters, daily exchange rates, and PayPal's actual
payout figures for paid invoices.

Never stored: secrets or tokens, full invoices, pasted chat text, client contact details beyond what a
stored result needs, and any card or bank detail. PayPal remains the source
of truth for invoices.

## Consequences

The in-memory store loses everything on restart, so idempotency and the cached payouts only last for
one process. That is fine for local work and tests. Migrations are plain SQL files applied in name order by
`npm run db:migrate`. A free Neon project can pause when idle, so the first request after a pause can
be slow.
