# 0001. Our own idempotency for create and send

## Status

Accepted.

## Context

A double click or a retry must never create or send a second invoice. PayPal does not document the
`PayPal-Request-Id` header for Invoicing v2, so we cannot count on PayPal to de-duplicate.

## Decision

Every create or send action carries a client-generated request ID. The server stores it in our
database under a unique constraint before it calls PayPal. A repeated request ID returns the stored
result and does not call PayPal again. A request ID reused with a different body returns
`duplicate_request`.

We may still send `PayPal-Request-Id`, but we never rely on it.

## Consequences

Idempotency works the same with Postgres and with the in-memory store. The store needs a table for
request IDs and their results. Creating and sending are separate steps, so a failed send leaves a
saved draft that the user can retry without creating a second invoice.
