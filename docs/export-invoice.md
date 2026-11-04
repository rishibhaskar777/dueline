# Printable export invoice

The invoice page has a "Download PDF" button. It opens `/invoices/{id}/print` in a new tab, which is
an A4 page of the invoice, and asks the browser to print it once the invoice is on screen. "Print or
save as PDF" on that page covers a print dialog that was closed. No PDF library is used: the browser
makes the PDF.

The page shows only what the invoice page already reads (`GET /api/invoices/{id}`) and the profile.
Nothing is invented. A field the app does not hold is left out, not filled in.

## What Rule 46 asks for, and what the page prints

Rule 46 of the CGST Rules, 2017 lists the particulars of a tax invoice.

| Rule 46 asks for                                    | The page prints                                                                                   |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Supplier's name, address and GSTIN                  | Business name, name, GSTIN and website from the profile, and the address when the profile has one |
| A unique serial number                              | The invoice number from PayPal                                                                    |
| Date of issue                                       | The invoice date                                                                                  |
| Recipient's name and address, and country of export | Business name, contact name and billing country. The street address is not held, so not printed   |
| Description, and the SAC of a service               | Each item's name and SAC                                                                          |
| Quantity, total value                               | Quantity, unit price, amount and the invoice total in the invoice currency                        |
| Taxable value after discount                        | The total, with an early-payment discount shown as its own line                                   |
| Rate and amount of tax                              | No tax is calculated: an export under LUT carries none. An invoice not under LUT prints a warning |
| Place of supply                                     | "Outside India"                                                                                   |
| Whether tax is payable on reverse charge            | "No"                                                                                              |
| Signature of the supplier                           | A signature line over the supplier's name                                                         |
| Export endorsement                                  | See below                                                                                         |

The export endorsement depends on whether the invoice carries the LUT declaration:

- under LUT: "Supply meant for export under bond or Letter of Undertaking without payment of
  integrated tax. LUT ARN <ARN>, valid until <date>." Rule 46 gives the wording in capitals, as one
  of two endorsements, "on payment of integrated tax" or "under bond or Letter of Undertaking without
  payment of integrated tax". The ARN is the one written on the invoice's note. The end date comes
  from the profile and is printed only while the profile still holds that same ARN;
- not under LUT: an export then needs integrated tax (IGST) on the invoice, and Dueline does not
  calculate it. Printing "on payment of integrated tax" without the tax would be wrong, so the
  endorsement is replaced by "Not under LUT: integrated tax (IGST) must be shown on this invoice.
  Add it with your CA before sending." The same warning shows on screen above the print button.
  "Tax payable on reverse charge: No" is printed either way.

Rule 46 also asks, for an export, for the recipient's name and address, the delivery address and the
country of destination in place of the details of an unregistered recipient. The page prints the
name, the contact and the billing country; the app holds no street address.

Rule 96A is the rule under which a registered person exports without paying integrated tax, on a
bond or a Letter of Undertaking furnished in form GST RFD-11. For services, tax and interest become
due if the payment is not realised in convertible foreign exchange (or in rupees where the RBI
permits) within 15 days after one year from the date of the export invoice.

## What is not on the page

- A QR code for the pay link: drawing one needs an encoder, and no package was to be added. The link
  is printed as text.
- The recipient's street address and the invoice value in rupees. Rule 46 does not ask for rupees,
  but the GST law converts the value of an invoice in a foreign currency; the GSTR-1 export in
  Dueline does that conversion, with a note to confirm it with a CA.
- A Quick Reference code or IRN, which applies to e-invoicing only.

The wording is the app's reading of the rules, not tax advice. Have a chartered
accountant confirm it.

## Sources

CBIC's own pages (`taxinformation.cbic.gov.in`) could not be opened from the build machine
(certificate error), so the wording was read from secondary sources that quote the rules:

- Rule 46, CGST Rules 2017 (particulars, export endorsement, reverse charge, signature):
  [gstzen.in, Tax invoice, Rule 46](https://gstzen.in/a/tax-invoice-cgst-rule-46.html).
- Rule 96A (export under bond or Letter of Undertaking, one year for services plus 15 days):
  the amended text as reproduced by [CGGST](https://www.cggst.com/uploads/document/1754288106-rule-96a.pdf)
  and [Taxguru](https://taxguru.in/?p=870698).

The official pages are
[Rule 46](https://taxinformation.cbic.gov.in/content/html/tax_repository/gst/rules/cgst_rules/active/chapter6/rule46_v1.00.html)
and
[Rule 96A](https://taxinformation.cbic.gov.in/content/html/tax_repository/gst/rules/cgst_rules/active/chapter10/rule96a_v1.00.html).
Check the printed wording against them before relying on it.
