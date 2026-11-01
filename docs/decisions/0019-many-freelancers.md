# 0019. Serving many freelancers

## Status

Proposed. **This is a design. None of it is built.** Dueline today serves one freelancer through one
PayPal sandbox account, and the code does not change because of this record. It is written down so
that the step from one freelancer to many is planned, and so that choices made now do not make it
harder.

Anything below about what PayPal offers is how it is understood today and must be checked against
PayPal's current documentation, and in some cases with PayPal, before it is built. Those points are
marked "to confirm".

## Context

Everything in Dueline is shared by one person. One set of PayPal credentials in the environment
creates, reads and reminds every invoice. One profile, one settings row, one set of client notes and
one queue sit in the database with nothing to say whose they are. The demo password protects a single
workspace. Safety rule 13 keeps the app on the PayPal sandbox.

A product for freelancers in India would have many of them, each with their own PayPal business
account, their own clients and their own money. The questions are how each one connects an account,
how their data stays apart, how shared limits are shared fairly, and what the free tiers stop
allowing.

## Decision

### 1. Each freelancer connects their own PayPal business account

Two ways exist. Both give Dueline permission to act on the freelancer's invoices without ever
holding their PayPal password.

**Log in with PayPal plus an invoicing permission (recommended to start).** The freelancer clicks
"Connect PayPal", signs in on PayPal and agrees to give Dueline access to their invoices. Dueline
receives an authorisation code, exchanges it for a refresh token and an access token, and reads the
freelancer's PayPal payer ID from the user-info call. It needs no agreement with PayPal beyond
creating an app, so it can be tried in the sandbox first. To confirm: that the invoicing scope is
available to an ordinary Log in with PayPal app, and which scopes the Payments and Transaction Search
reads need.

**Partner onboarding with third-party permissions.** Dueline becomes a PayPal partner. The freelancer
is sent through PayPal's seller onboarding link (Partner Referrals), which grants the partner
permissions on their account. Dueline then calls PayPal with its own token and an assertion naming
the freelancer's merchant ID. It gives a smoother sign-up and is how platforms usually integrate, but
it needs PayPal to approve Dueline as a partner. To confirm: whether Invoicing is among the
permissions a partner can be given, which is the largest unknown in this whole design. If it is not,
this route is closed and the first one is the only one.

The recommendation is to build the first, keep the token code behind one function so the second can
replace it, and ask PayPal about partner access in parallel.

### 2. A tenant ID on every stored row

A **tenant** is one freelancer's workspace. A `tenants` table holds the ID, the PayPal payer ID and
the state of the connection (connected, needs reconnecting, disconnected). Every table that holds
something private gets a `tenant_id` column, part of its primary key or unique constraint:

- profile, settings, client notes and client language, the item library, monthly repeats, the queue
  and the digest;
- the request log that makes create and send safe to repeat, so that `unique (tenant_id, request_id)`
  replaces `unique (request_id)` and one freelancer's request ID can never replay another's;
- the stored payout figures, the reminder log, the activity feed and the webhook event log;
- the rate-limit counters and the model-answer cache, whose keys gain the tenant ID, because a cached
  extraction contains one freelancer's clients and prices.

What is the same for everyone stays shared and has no tenant: the ECB rates and their history.

In code the `Store` is no longer a global. `getStore()` becomes `storeFor(tenant)`, which returns a
store whose every method already has the tenant ID filled in, so no query can forget it. Routes get
the tenant from the session, never from the request body or the URL.

### 3. Sign-in, per-tenant tokens and webhooks

The shared demo password is replaced by Log in with PayPal. The first sign-in creates the tenant. The
signed session cookie carries the tenant ID, and `proxy.ts` resolves it before a route runs. The demo
password stays for demo deployments.

**Tokens.** A `tenant_credentials` table holds each freelancer's refresh token encrypted with a key
that is held outside the database (an environment secret, or a key service when one is paid for).
`getAccessToken(tenant)` keeps short-lived access tokens in memory per tenant, refreshes them as
`token.ts` does today, and marks the tenant "needs reconnecting" when PayPal refuses the refresh
token. Disconnecting deletes the credentials. The PayPal SDK client, which is built once today, is
built per tenant and cached.

**Webhooks.** One webhook is registered on the Dueline app and receives events for every connected
freelancer. The signature check stays exactly as it is (PayPal's own verification call, the raw body,
each event processed once). What is new is deciding whose event it is. Dueline writes a row in
`invoice_index (invoice_id, tenant_id)` when it creates or first reads an invoice, and looks the
event's invoice up there. To confirm: whether the event itself names the merchant, which would make
the index a fallback rather than the only way. As today the event only triggers a fresh read of the
invoice from PayPal, now with that tenant's token. A daily read per tenant covers events that never
arrive.

### 4. Data isolation in Postgres with row-level security

Filtering by `tenant_id` in code is the first defence and row-level security is the second, so a
missed filter cannot leak a row.

- The application connects as a role that does not own the tables, and every private table has
  `enable row level security` and `force row level security`. Migrations run as the owner.
- A policy on each table says `using (tenant_id = current_setting('app.tenant_id')::uuid)` with the
  same `with check`.
- Each request that touches the database runs in a transaction that starts with
  `set local app.tenant_id = ...`. `set local` matters: Neon's pooled connection goes through
  PgBouncer in transaction mode, where a plain `set` would outlive the request and apply to the next
  user of the connection. The store is already created with `prepare: false` for the same reason.
- A test signs in as two tenants and checks that each reads, updates and deletes none of the other's
  rows, for every table. A table without a policy fails a test that lists the tables.

### 5. Limits for each freelancer

Today one count covers the whole app: 400 model calls a day and 10 extractions an hour for each
address. With many freelancers one person could use everyone's share.

- **Model calls.** A per-tenant daily limit, for example `ai-calls:<tenant>:<day>` at 20, is counted
  first, the way the per-address limit is counted before the shared one today. The app-wide ceiling
  stays, because the free Gemini quota is one pool. The per-tenant limit is set so that the active
  tenants together stay under the ceiling; past that, either the limit falls or a paid Gemini plan is
  used. Drafts that fall back to templates keep working at any limit.
- **Reminders.** PayPal limits reminders per caller, and the caller is now each freelancer's account,
  so the counts and the "one reminder per invoice per India day" rule are kept per tenant.
- **Everything else** that is counted by address stays counted by address, and gains the tenant.

### 6. Where Vercel Hobby stops

The Hobby plan is for personal, non-commercial projects. Serving other people's businesses as a
product is outside it, so the first thing that changes is the plan, before any limit is reached.
Beyond that, the limits that matter are these (check current numbers before relying on any):

| Area                | Free tiers today                                         | What a paid plan changes                                                                |
| ------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Vercel use          | Personal, non-commercial                                 | Pro allows commercial use                                                               |
| Scheduled jobs      | One run a day; the daily preparation walks one workspace | Runs as often as every minute, so one job can take a few tenants each time or fan out   |
| Function time       | Short; a loop over many freelancers would time out       | Longer functions, and a queue service to process each tenant on its own                 |
| Neon                | Small storage, compute that suspends when idle           | More storage, no suspension, more connections, point-in-time restore                    |
| Gemini              | One shared daily quota per model; free-tier data terms   | Higher quota, billing, and terms under which prompts are not used to improve the models |
| Free exchange rates | Frankfurter, shared and cached once a day                | Unchanged: it is one shared read                                                        |

The daily preparation becomes a fan-out: a frequent cron picks the tenants whose 06:00 India time
has passed and whose run for the day is not claimed, claims one, and processes it within the
function's time. The claim is `daily-run:<tenant>:<day>`, the same idempotent claim used today.

### 7. A short path from today's single account

Each step ships by itself, and the app behaves as it does now after each one.

1. **Name the tenant.** Add the `tenants` table with one row for today's account. Add `tenant_id` to
   every private table as nullable, fill it with that tenant, make it required, and change the unique
   constraints to include it. No query changes yet.
2. **Bind the store.** Introduce `storeFor(tenant)` and a tenant context read from the session. In
   a single-tenant deployment the context is always that one tenant, and the PayPal credentials in
   the environment are stored as that tenant's credentials. Tests keep passing because nothing
   observable changes.
3. **Turn on row-level security.** Switch the app to the non-owner role with the policies, first
   only checking and logging violations, then enforcing.
4. **Connect.** Add Log in with PayPal, the credentials table, per-tenant tokens and the connect and
   disconnect screens. Sign-in moves from the shared password to the PayPal account. Still sandbox
   only.
5. **Limits and jobs.** Per-tenant model limits and the fan-out daily run, and the move to a plan that
   allows commercial use.

What this record does not decide: taking real money. Safety rule 13 keeps Dueline on the sandbox, and
moving to PayPal's live environment needs its own record. It would involve PayPal's review of the
app, a privacy policy and terms, a way for a freelancer to export and delete their data, and a
statement of what the RBI purpose-code and GST suggestions are and are not.

## Consequences

Nothing changes in the code today, so nothing gets harder. The design shows that the existing habits
carry over: every write already has a request ID and a claim, so adding the tenant to the claim is a
small change; the store is already one interface, so binding it to a tenant is one place; and the
webhook already only triggers a fresh read, so changing whose token that read uses is local.

What it costs when built: every query and every cache key must carry the tenant, which is easy to get
wrong and is the reason for row-level security and the two-tenant test. Storing refresh tokens makes
Dueline a holder of credentials, which needs encryption at rest, a plan for rotating the key, and a
way to revoke. The largest risk is outside the code: PayPal may not offer third-party invoicing to
Dueline on the terms assumed here, and that has to be settled with PayPal first.
