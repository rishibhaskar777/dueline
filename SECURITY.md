# Security policy

## Scope

Dueline is a hackathon project that runs on the PayPal sandbox only. The app refuses to start
unless `PAYPAL_ENVIRONMENT=sandbox`, and no real money moves. Please still report anything that
looks like a vulnerability.

## Reporting a vulnerability

Use GitHub private vulnerability reporting: open the **Security** tab of this repository and choose
**Report a vulnerability**. Please do not open a public issue for a security problem.

Include what you found, how to reproduce it and what you think the impact is. You will get a reply
as soon as the maintainer can read it.

## What is never logged

- Secrets such as API keys, client secrets and database URLs.
- Email addresses and phone numbers.
- Text from pasted client chats.
- Full invoices.

When PayPal returns an error, only its `debug_id` is logged.

## How secrets are kept

Secrets are read only in server code, which imports `server-only` so a browser bundle cannot
include it. They are never sent to the browser or committed. Only `.env.example` is committed, and
it holds no values.

## Privacy filter

Before any text is sent to the AI model, code finds email addresses and phone numbers and replaces
them with placeholders. The real values are filled back into the draft by code after the model
answers. The model never sees them.
