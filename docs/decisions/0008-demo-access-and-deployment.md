# 0008. Demo access and deployment

## Status

Accepted.

## Context

Dueline is deployed on a public address, and every route can create or send invoices in the PayPal
sandbox. Without a gate, a stranger who finds the address could change the demo. PayPal must also be
able to tell Dueline that a client paid, and the repository has to deploy to a free host without a
credit card.

## Decision

**A shared demo password with a signed cookie, not user accounts.** The demo has one freelancer and
no real data, so accounts, sign-up and password reset would be work with nothing to protect. One
password (`DEMO_PASSWORD`) is checked by `POST /api/demo/session`, which sets a cookie holding an
expiry time and an HMAC-SHA256 signature made with `SESSION_SECRET`. The cookie is HttpOnly,
SameSite=Lax and lasts 7 days. `src/proxy.ts` checks it before every protected route using only Web
Crypto, with no database call, so it stays fast. Wrong passwords are limited to 10 attempts in 15
minutes from one address. The health route, the PayPal webhook and the sign-in route stay public.
In production both settings are required, and a missing one makes protected routes fail with
`config_error` rather than open up.

**Webhooks are verified by postback and only trigger a fresh read.** PayPal signs each event, and
the signature can only be checked by PayPal's verify-webhook-signature API, which needs the exact
bytes it sent. So the request to PayPal embeds the received body as text and never parses it and
writes it out again. Simulator events fail this check and are refused. A verified event is not
trusted for its contents: Dueline reads the invoice from PayPal again and uses that. Each event ID
is processed once, and the activity row uses the event ID as its key, so a repeat cannot add a
second row.

**Render's free plan, with Neon in Singapore.** Both are free without a card, and both are in
Singapore, close to each other and to users in India. The Blueprint (`render.yaml`) has no
pre-deploy command and no health check, because the free plan has no shell and the health route
calls PayPal and the database. Migrations are run from the developer's computer against the same
Neon database.

**Sleeping.** A free Render service sleeps after 15 minutes without traffic. The first request after
that takes tens of seconds, so the demo is opened a few minutes beforehand. A webhook that arrives
while the service is asleep may time out. PayPal retries any answer that is not 2xx up to 25 times
over 3 days, and the retry wakes the service, so the event is not lost. If processing fails after
verification the route answers 500 on purpose, so that PayPal retries it.

## Consequences

Anyone with the password has full access to the demo, and the password is shared outside the code.
The rate limit uses the first address in `x-forwarded-for`, which a client can influence, so it
slows guessing but does not stop a determined attacker. If Dueline ever holds real users' data, this
must be replaced with accounts. Each webhook costs two or three PayPal calls, which is fine at demo
volume.
