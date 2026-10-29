# Decision records

An architecture decision record (ADR) is a short note about one decision that shapes the project:
what was going on, what we chose and what follows from it. Records are kept so that later readers
can see why the code looks the way it does.

Each record has a number, a status, a context, a decision and consequences. Do not rewrite an
accepted record. If a decision changes, add a new record and mark the old one as superseded.

Copy [0000-template.md](0000-template.md) to start a new one.

| Record                             | Title                                   |
| ---------------------------------- | --------------------------------------- |
| [0001](0001-own-idempotency.md)    | Our own idempotency for create and send |
| [0002](0002-demo-clock.md)         | A demo clock                            |
| [0003](0003-free-tier-hosting.md)  | Free-tier hosting                       |
| [0004](0004-paypal-integration.md) | How we integrate with PayPal            |
| [0005](0005-toolchain.md)          | Toolchain versions                      |
| [0006](0006-storage.md)            | Storage                                 |
