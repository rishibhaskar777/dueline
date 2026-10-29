# 0003. Free-tier hosting

## Status

Superseded by [0009](0009-hosting-on-vercel.md)

## Context

Everything Dueline uses must be free and must not need a credit card. We need a web host and a
database.

## Decision

We host the app on a Render free web service and keep data in a Neon free Postgres project. Both are
in the Singapore region, close to each other and to users in India.

We do not store data in local files. Render's free disk is wiped on every restart and deploy, so
anything written there would disappear. All state lives in Postgres, or in memory when no database
is configured.

Render's free service sleeps after 15 minutes without traffic, and the first request afterwards is
slow. For the demo, we open the app and the health endpoint a few minutes beforehand to wake it up.
The sidebar status line also calls the health endpoint as soon as the page loads.

## Consequences

Hosting costs nothing. The in-memory store loses data on restart, so the demo seed must be easy to
re-run. Cold starts are slow and have to be handled when presenting.
