# 0016. The business profile and GST exports

## Status

Accepted.

## Context

Dueline's invoices carried PayPal's sandbox name ("Test Store") and nothing about the freelancer, and
its reminders ended in a bare "Thank you". A freelancer in India who exports services also has to
show a GSTIN and a Letter of Undertaking (LUT) on the invoice, and their chartered accountant (CA)
asks for two things each year: the export invoices for GSTR-1, and the year's receipts for the
presumptive tax scheme.

## Decision

**One profile, one row.** The profile (name, business name, GSTIN, LUT ARN and end date, default SAC,
website, sign-off) is a single record in a `profile` table, the same shape as `settings`
(migration 004). An empty profile is the defaults, so nothing breaks before it is filled in. The
format of each identifier is checked on save (GSTIN, 6-digit SAC starting with 99, 15-character ARN),
which catches a typo but does not prove the number exists.

**What is printed where.**

| Where                       | What                                                                                                                                                                                   |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Invoice header (`invoicer`) | business name, your name split into given name and surname, GSTIN as `tax_id`, website; each only when set. PayPal's create call takes these, so "Test Store" is replaced.             |
| Item description            | `SAC 998314` when the item has a SAC                                                                                                                                                   |
| Invoice note                | with the LUT box ticked: the declaration "SUPPLY MEANT FOR EXPORT UNDER LETTER OF UNDERTAKING WITHOUT PAYMENT OF INTEGRATED TAX", `LUT ARN: <ARN>` when saved, and the place of supply |
| Private memo                | the request marker, the purpose code and `sac:<code>` of the first item, through the one memo helper, so the export register can read it                                               |
| Reminders                   | the sign-off, then your name on the next line; no name is ever invented                                                                                                                |

Invoices made before this change carry the shorter line "Export of services under LUT, without
payment of IGST". It still counts as under LUT, so older rows keep their LUT flag.

**The AI never sees the profile and never picks a SAC.** The reminder model writes the body only;
code adds the sign-off, so the name is not sent to the model and cannot be changed by it. Room for
the longest sign-off is kept inside the 900 characters a reminder may have. A draft's SAC is the
profile's default, set by code after the model has answered.

**GSTR-1 follows the invoice date.** GST is due on the supply, so the export holds the invoices
issued in the month, paid or not. They are written in the `exp` sheet's columns: Export Type `WOPAY`
with rate 0 for an invoice under LUT, `WPAY` with rate 18 otherwise, port code and shipping bill
blank. Dates are `dd-mmm-yyyy`.

**The ECB rate, with a caveat.** The value in rupees is the invoice amount at the ECB rate of the
invoice date, to the paisa. Dueline already has those rates for every date, free and without a key.
The rule for GST is the RBI reference rate of the date, which differs slightly, so the file and the
screen say "Estimate. Confirm with your CA." and the CA should confirm the rate before filing.

**The year summary is an estimate, and says so.** It adds up what the invoices paid in the financial
year (1 April to 31 March, by India date) brought: rupees PayPal paid out (the one rupee rule),
rupees recorded outside PayPal, PayPal's fees and the conversion loss. A payment's fee and loss are
the part of its market value (amount at the ECB rate of the payment date) that did not reach the
bank, split with the fee first. Gross receipts are the four added together, because section 44ADA is
charged on what the client paid, not on what is left after PayPal. Presumptive income is 50% of
that. The limit is 75 lakh when cash receipts are at most 5% of the total and 50 lakh otherwise;
Dueline records no cash, so 75 lakh applies, and a warning appears above it. The tax rules are
simplified: no advance tax, no other income, no refunds. Every figure is labelled as an estimate.

## Consequences

- The profile is shared by everyone who can open the app. That fits a single freelancer's demo.
- `LineItem` gains `sac`, `ExportRegisterRow` gains `sac`, and `toPayPalInvoice` needs a profile.
- The register CSV gains a SAC column and a GSTIN comment line above its headers.
- Invoice rupee values in GSTR-1 can differ from the RBI rate by a small amount.
- Refunds and cancelled invoices are not netted off either export.
