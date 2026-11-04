import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { InvoiceDocument } from "@/components/print/InvoiceDocument";
import { buildPrintDocument } from "@/components/print/print-invoice";
import { EMPTY_PROFILE, type InvoiceDetailResponse, type Profile } from "@/types";

const profile: Profile = {
  ...EMPTY_PROFILE,
  yourName: "Riya Sharma",
  businessName: "Riya Sharma Design",
  gstin: "29ABCPS1234C1Z5",
  address: "12 Brigade Road, Bengaluru 560001, Karnataka",
  website: "https://riya.example.com",
  lutArn: "AD2904260012345",
  lutValidUntil: "2027-03-31",
};

const LUT_NOTE =
  "SUPPLY MEANT FOR EXPORT UNDER LETTER OF UNDERTAKING WITHOUT PAYMENT OF INTEGRATED TAX\nLUT ARN: AD2904260012345\nPlace of supply: outside India";

function detail(underLut: boolean, note = ""): InvoiceDetailResponse {
  return {
    invoice: {
      id: "INV2-1",
      number: "INV-0050",
      client: {
        name: "Kraftwerk Studio",
        email: "buyer@personal.example.com",
        country: "DE",
        contactName: "Lena Fischer",
      },
      work: "Logo final files",
      amount: { currency: "EUR", value: "1230.00" },
      issuedOn: "2026-11-04",
      dueOn: "2026-11-19",
      paidOn: null,
      paypalStatus: "SENT",
      dueState: "on_time",
      daysLate: 0,
      payoutInr: null,
      payoutSource: null,
      rateDate: null,
      actualPayout: null,
      purposeCode: "P1007",
      payLink: "https://paypal.invalid/offline-invoice/INV2-1",
      riskLevel: null,
    },
    timeline: [],
    reminders: [],
    details: {
      clientKey: "kraftwerk-studio",
      clientPaySpeed: null,
      items: [
        {
          name: "Logo final files",
          quantity: 1,
          unitAmount: { currency: "EUR", value: "400.00" },
          sac: "998391",
        },
        {
          name: "Business card designs",
          quantity: 2,
          unitAmount: { currency: "EUR", value: "90.00" },
          sac: "998391",
        },
        {
          name: "Brand guideline PDF",
          quantity: 1,
          unitAmount: { currency: "EUR", value: "650.00" },
          sac: null,
        },
      ],
      note,
      underLut,
      hiddenFromDemo: false,
      split: null,
      actions: { remind: false, recordPayment: true, cancel: true, send: false },
    },
  };
}

function render(source: InvoiceDetailResponse, who: Profile = profile): string {
  return renderToStaticMarkup(
    createElement(InvoiceDocument, { doc: buildPrintDocument(source, who) }),
  );
}

describe("printable tax invoice", () => {
  it("shows every field for an invoice under LUT", () => {
    const html = render(detail(true, LUT_NOTE));
    for (const text of [
      "Tax invoice",
      "Riya Sharma Design",
      "Riya Sharma",
      "12 Brigade Road, Bengaluru 560001, Karnataka",
      "GSTIN 29ABCPS1234C1Z5",
      "https://riya.example.com",
      "INV-0050",
      "4 Nov 2026",
      "19 Nov 2026",
      "Kraftwerk Studio",
      "Attn: Lena Fischer",
      "Billing country: Germany",
      "Outside India",
      "Logo final files",
      "998391",
      "€400.00",
      "€180.00",
      "€1,230.00",
      "https://paypal.invalid/offline-invoice/INV2-1",
      "P1007",
      "Supply meant for export under bond or Letter of Undertaking without payment of integrated tax. LUT ARN AD2904260012345, valid until 31 Mar 2027.",
    ]) {
      expect(html, text).toContain(text);
    }
  });

  it("prints a warning, not an endorsement, for an invoice not under LUT", () => {
    const html = render(detail(false));
    expect(html).toContain(
      "Not under LUT: integrated tax (IGST) must be shown on this invoice. Add it with your CA before sending.",
    );
    expect(html).toContain("Tax payable on reverse charge");
    expect(html).not.toContain("Supply meant for export");
    expect(html).not.toContain("Letter of Undertaking");
  });

  it("does not print the client's email address", () => {
    expect(render(detail(true, LUT_NOTE))).not.toContain("buyer@personal.example.com");
  });

  it("leaves out the end date when the profile's LUT is not the one on the invoice", () => {
    const html = render(detail(true, LUT_NOTE), { ...profile, lutArn: "ZZ0000000000000" });
    expect(html).toContain("LUT ARN AD2904260012345.");
    expect(html).not.toContain("valid until");
  });

  it("prints only what is known: no address, GSTIN or country when there are none", () => {
    const source = detail(false);
    source.invoice.client = { name: "Kraftwerk Studio", email: "buyer@personal.example.com" };
    const html = render(source, { ...EMPTY_PROFILE, yourName: "Riya Sharma" });
    expect(html).not.toContain("GSTIN");
    expect(html).not.toContain("Billing country");
    expect(html).not.toContain("Attn:");
  });

  it("shows an early-payment discount as the gap between the items and the total", () => {
    const source = detail(false);
    source.invoice.amount = { currency: "EUR", value: "1205.40" };
    const doc = buildPrintDocument(source, profile);
    expect(doc.discount).toBe("€24.60");
    expect(doc.total).toBe("€1,205.40");
  });
});
