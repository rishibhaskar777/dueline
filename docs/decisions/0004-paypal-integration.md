# 0004. How we integrate with PayPal

## Status

Accepted.

## Context

Dueline needs PayPal OAuth, Invoicing v2, captures and transaction search. PayPal publishes the
Server SDK (`@paypal/paypal-server-sdk`) and an agent toolkit (`@paypal/agent-toolkit`).

The Server SDK has controllers for OAuth, Payments and Transaction Search, but none for Invoicing.

We evaluated `@paypal/agent-toolkit` 1.11. It depends on `ai` 4 and `zod` 3, and its AI SDK tools
are incompatible with AI SDK 7, which this project uses.

## Decision

We use Server SDK 2 for OAuth, Payments and Transaction Search. We write a small typed REST client
for Invoicing v2.

We do not use `@paypal/agent-toolkit`. Dueline defines its own agent tools with the AI SDK's `tool`
helper, on top of the same PayPal endpoints.

## Consequences

We own a small amount of REST code for invoices and must keep it in step with PayPal's API. We
avoid pinning old major versions of `ai` and `zod`. Our tools expose only the actions Dueline
needs, and each one still requires an explicit user click before anything changes.
