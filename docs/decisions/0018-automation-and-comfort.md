# 0018. Automation and comfort

## Status

Accepted.

## Context

In the user test a freelancer found Nudges slow to open, said they would use Dueline more if it did
the boring part before they arrived, and asked for the small comforts of a tool used every day: a dark
screen at night, a keyboard shortcut, something that works on a phone, reminders their German client
can read. Everything has to stay free and needs no credit card.

## Decision

**Automation only prepares.** The daily run writes reminder drafts, lists them in a queue, turns due
monthly repeats into drafts and records a digest. It never creates, sends or reminds anything in
PayPal or to a client. Every item in the queue is a place to start: "Review and send" opens the
Nudges card or New invoice, and the freelancer still clicks send. This keeps the first safety rule
(nothing that reaches a client happens without a click) true however much is automated, and it means
a bug in the run can waste a model call but cannot message a client.

**In the app, not by email or WhatsApp.** The digest, the queue and the rate alerts live on the
screens, plus an optional browser notification while the app is open. Email needs a sending service
and a verified domain, WhatsApp needs a business account and per-message fees, and a push service
needs a subscription store and a service worker. None is free and simple, and each would hold the
freelancer's data in one more place. The cost is that Dueline cannot tell anyone anything when it is
closed, which the freelancer accepts for now.

**Vercel Cron on the Hobby plan.** A job runs at most once a day, an expression that fires more often
fails the deploy, and the run may start at any minute of the scheduled hour. `vercel.json` therefore
holds one job, `30 0 * * *` (06:00 India time), and nothing depends on the exact minute. Delivery is
best effort and can repeat, so the job is idempotent: it claims the request ID `daily-run:<India
day>` with the same helper that guards invoice creation, a repeat gets the stored result, and a run
that fails releases the claim. Inside the run, the reminder items are replaced as a set, a retainer
item is added with "insert unless present", and a repeat's date moves on only after its item exists,
so stopping at any point leaves something the next run can finish without doing anything twice.

The job is protected by `CRON_SECRET`, which Vercel sends as a bearer token. It is compared in
constant time (both sides hashed first) and nothing is accepted when the variable is unset. Cron
requests do not follow redirects and cannot send the demo cookie, so the path is excluded from the
proxy; its own secret is its protection. A "Run today's preparation now" button on Demo tools calls
the same code behind the demo cookie, in demo mode only, with the same once-a-day rule.

**Today is two clocks.** What is overdue or due uses the demo clock like everything else. The
once-a-day marker uses the real India day, because it describes the morning the job ran and must
advance even when `DEMO_TODAY` is fixed.

**The first answer is fast.** `GET /api/reminders` used to wait for up to ten model calls. It now
answers from the cache or the template and marks the template `pending`. The screen asks for better
drafts one card at a time, two at once at most, and replaces the text only when the user has not
edited it. The daily run fills the cache, so on most mornings nothing is pending.

**Reminder languages are checked, not trusted.** Seven languages have templates in code. A model
draft in another language passes the same checks as an English one, with the invoice amount read in
that language's number format; a draft that fails is replaced by the template. Only the default
sign-off is translated, because a sign-off the freelancer wrote is theirs.

**Preferences live in the browser; data lives on the server.** The theme, the dashboard layout and the
notification switch are per browser: they describe a screen, a permission belongs to one browser, and
none is worth a database row. Rate alerts, the days before a reminder is queued, the morning switch,
the item library, repeats and a client's language describe the freelancer's business, so they are
stored and follow them to another device.

## Consequences

- Migration 006 adds the queue, repeats and library tables and a language column on the client
  notes; 007 reshapes the queue (a kind column in place of the day and dismissed ones). Settings gain three fields with defaults, so older saved settings still load.
- The theme is one toggle that stores only "light" or "dark", starts from the device on a first visit and, where the browser has view transitions, reveals the new theme as a circle growing from the button.
- Queue items stay until the freelancer acts on them or dismisses them. Reminder items are replaced
  by each run, so a paid or no longer overdue invoice drops out and "Dismiss for today" lasts until the
  next run. A retainer item stays until its draft is sent or dismissed, so a draft not opened on the
  day it was prepared is still there the next morning.
- With the daily switch off, no reminder drafts are written ahead, so Nudges falls back to the fast
  first answer with pending drafts.
- Hindi and the other templates are written once and kept in `src/lib/reminders`. A native speaker
  should read them before they go to a real client.
- Dark mode and the phone layout touch most screens through shared tokens and components, not
  per-screen rules, so a new screen gets both by using the tokens.
