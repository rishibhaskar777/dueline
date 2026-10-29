# 0007. Fees and rates

## Status

Accepted.

## Context

A freelancer in India wants to know what will reach the bank in rupees before an invoice is sent,
and what really did reach it once the client has paid. PayPal charges a fee on the payment and, when
the money is converted to rupees, a markup over the base exchange rate. Dueline needs figures for
both before PayPal has reported anything.

## Decision

**Fees.** The defaults are the fees PayPal India publishes for international commercial payments
at paypal.com/in/webapps/mpp/merchant-fees, checked on 29 Oct 2026: 4.40% plus a fixed fee by
currency (USD 0.30, EUR 0.35, GBP 0.20, CAD 0.30, AUD 0.30), and a 3.0% markup over the base
exchange rate when payments received are converted into another currency. They are stored in
settings so the freelancer can change them when their agreement differs, for example after a
negotiated rate.

**Rates.** The market rate is the European Central Bank's daily reference rate, read through
Frankfurter. It is free, needs no key, and the ECB is a neutral source that is not PayPal. Frankfurter
quotes everything against the euro, so rupees per unit of a currency are the euro-to-rupee rate
divided by the euro-to-currency rate. The ECB publishes on working days around 16:00 CET, so the rate
can be a day or more old. Each estimate says which date its rate is from. Rates are fetched at most
once a day and stored with both the day fetched and the ECB's own date. If the service is down, the
latest stored rates are used, and after that the rates saved in settings. The freelancer can also
choose "My own rates".

**Estimate and truth.** Before payment, the rupee figure is an estimate and is labelled as one. After
payment, PayPal's own fee and net amount are shown beside it, because PayPal's figures are the truth.
The rupees on a paid invoice are PayPal's `netInr` when it reports one. When it does not, PayPal's net
amount is converted at the estimated PayPal rate. The sums use integer minor units, basis points for
percentages and ten-thousandths for rates, with halves rounded up, so no float touches an amount.

**The sandbox reports no conversion.** The sandbox business account keeps US dollars, so a 100.00
USD invoice reports a fee of 4.96 and a net of 95.04 USD with no exchange rate and no rupees. In
production the conversion happens when the money is withdrawn to an Indian bank. This is why the
rupee figure for a paid sandbox invoice is a conversion of PayPal's real net amount, not a figure
PayPal reported.

## Consequences

The fee defaults can go out of date when PayPal changes its page, so the date they were checked is
recorded here, in the API contract and in the code. The estimate never claims to be PayPal's figure.
When the rate service is down the estimate uses older rates and shows their date, so the screens keep working.
