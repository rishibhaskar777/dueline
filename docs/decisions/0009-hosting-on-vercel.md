# 0009. Hosting on Vercel

## Status

Accepted. Supersedes [0003](0003-free-tier-hosting.md) and the hosting section of
[0008](0008-demo-access-and-deployment.md).

## Context

Render's free web service sleeps after 15 minutes without traffic, and the next request waits about
a minute. A judge who opens the demo cold would see that wait.

The sign-in rate limit is keyed on the first address in `x-forwarded-for`. On Render a client can
send its own value for that header, so the limit could be bypassed.

Vercel's Hobby plan is free, and Vercel documents these limits (checked on 29 Oct 2026): one function
region, functions that run up to 300 seconds, request bodies up to 4.5 MB, 1 million function
invocations and 4 hours of active CPU a month (time spent waiting on I/O does not count), hard caps
with no paid overage, and use limited to personal, non-commercial projects. Node.js 24.x is the
default. Functions do not sleep. Vercel overwrites `x-forwarded-for` with the client's real address,
so the client cannot choose it. The default function region is iad1 (Washington, D.C.), while our Neon
database is in Singapore.

## Decision

We host on Vercel Hobby. `vercel.json` pins functions to `sin1` (Singapore), next to the Neon
database; without it every request would cross the Pacific twice. A test keeps that setting from
being edited away by accident.

Secrets are set for the Production environment only. Preview deployments are protected by Vercel
Authentication and have no PayPal or database access, so a preview build shows the existing "not
configured" page.

Migrations still run from the developer's computer with `npm run db:migrate` against the same Neon
database.

## Consequences

The usage caps are hard: if the demo goes over them, Vercel stops serving it instead of charging.
That is acceptable at demo volume.

Module-level caches (the PayPal token, the daily rates) live inside one function instance. A cold
instance fetches its own token and rates, so some requests make one extra call.

The free plan is for non-commercial use, which a hackathon entry is. If Dueline became a product, it
would have to move to a paid plan or another host.

The sign-in rate limit can now trust the first address in `x-forwarded-for`, because Vercel sets it.
