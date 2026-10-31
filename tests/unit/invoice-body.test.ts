import { beforeEach, describe, expect, it } from "vitest";
import {
  LUT_DECLARATION,
  mentionsLut,
  requestMemo,
  toPayPalInvoice,
} from "@/lib/paypal/invoice-body";
import { EMPTY_PROFILE, type CreateInvoiceRequest, type Profile } from "@/types";
import { stubEnv } from "../support/env";

const requestId = "3f2b8c1e-6a4d-4e8b-9c1a-2d5e7f9a0b1c";

const draft: CreateInvoiceRequest["draft"] = {
  client: { name: "Halden Coffee Co.", email: "mike@haldencoffee.example" },
  currency: "USD",
  dueOn: "2026-11-30",
  items: [
    { name: "Logo design (3 options)", quantity: 3, unitAmount: "120.00", sac: null },
    {
      name: "Revision round",
      quantity: 2,
      unitAmount: "45.00",
      sourceQuote: "$45 a round",
      sac: null,
    },
  ],
  purposeCode: "P1099",
  includeLutNote: false,
};

const options = {
  invoiceNumber: "0042",
  invoiceDate: "2026-10-30",
  requestId,
  profile: EMPTY_PROFILE,
};

const profile: Profile = {
  ...EMPTY_PROFILE,
  yourName: "Riya Sharma",
  businessName: "Riya Sharma Design",
  gstin: "29ABCPS1234C1Z5",
  lutArn: "AD2904260012345",
  defaultSac: "998391",
  website: "https://riya.example.com",
};

beforeEach(() => stubEnv());

describe("toPayPalInvoice", () => {
  it("builds a plain invoice from a draft", () => {
    expect(toPayPalInvoice(draft, options)).toEqual({
      detail: {
        invoice_number: "0042",
        invoice_date: "2026-10-30",
        currency_code: "USD",
        memo: `dueline-request:${requestId} purpose:P1099`,
        payment_term: { term_type: "DUE_ON_DATE_SPECIFIED", due_date: "2026-11-30" },
      },
      primary_recipients: [
        {
          billing_info: {
            email_address: "mike@haldencoffee.example",
            business_name: "Halden Coffee Co.",
          },
        },
      ],
      items: [
        {
          name: "Logo design (3 options)",
          quantity: "3",
          unit_amount: { currency_code: "USD", value: "120.00" },
        },
        {
          name: "Revision round",
          quantity: "2",
          unit_amount: { currency_code: "USD", value: "45.00" },
        },
      ],
    });
  });

  it("keeps the purpose code out of the reference the client sees", () => {
    expect(toPayPalInvoice(draft, options).detail).not.toHaveProperty("reference");
  });

  it("puts the note and the LUT line on separate lines", () => {
    const body = toPayPalInvoice(
      { ...draft, note: "Files are in the shared folder.", includeLutNote: true },
      options,
    );
    expect(body.detail.note).toBe(
      `Files are in the shared folder.\n${LUT_DECLARATION}\nPlace of supply: outside India`,
    );
    expect(toPayPalInvoice({ ...draft, includeLutNote: true }, options).detail.note).toBe(
      `${LUT_DECLARATION}\nPlace of supply: outside India`,
    );
  });

  it("carries the request in the memo so the invoice can be found again", () => {
    expect(requestMemo(requestId)).toBe(`dueline-request:${requestId}`);
  });

  it("stores the purpose code in the private memo next to the request, only when one is chosen", () => {
    expect(toPayPalInvoice(draft, options).detail.memo).toBe(
      `dueline-request:${requestId} purpose:P1099`,
    );
    expect(toPayPalInvoice({ ...draft, purposeCode: null }, options).detail.memo).toBe(
      requestMemo(requestId),
    );
  });

  it("applies PayPal's invoice discount, says so in the note and moves the due date earlier", () => {
    const body = toPayPalInvoice(
      { ...draft, includeLutNote: true },
      { ...options, discount: { percent: 2, withinDays: 7 } },
    );
    expect(body.amount).toEqual({
      breakdown: { discount: { invoice_discount: { percent: "2" } } },
    });
    expect(body.detail.note).toBe(
      `${LUT_DECLARATION}\nPlace of supply: outside India\nIncludes a 2% early-payment discount, valid if paid by 6 Nov 2026`,
    );
    expect(body.detail.payment_term.due_date).toBe("2026-11-06");
  });

  it("keeps the user's due date, and says it in the note, when it is sooner than the discount window", () => {
    const body = toPayPalInvoice(
      { ...draft, dueOn: "2026-11-02" },
      { ...options, discount: { percent: 3, withinDays: 14 } },
    );
    expect(body.detail.payment_term.due_date).toBe("2026-11-02");
    expect(body.detail.note).toContain("valid if paid by 2 Nov 2026");
    expect(body.detail.note).not.toContain("13 Nov");
  });

  it("leaves the amount out when there is no discount", () => {
    expect(toPayPalInvoice(draft, options)).not.toHaveProperty("amount");
  });

  it("leaves the invoicer out when the profile is empty", () => {
    expect(toPayPalInvoice(draft, options)).not.toHaveProperty("invoicer");
  });

  it("prints the profile in the invoice header, each part only when set", () => {
    expect(toPayPalInvoice(draft, { ...options, profile }).invoicer).toEqual({
      business_name: "Riya Sharma Design",
      name: { given_name: "Riya", surname: "Sharma" },
      tax_id: "29ABCPS1234C1Z5",
      website: "https://riya.example.com",
    });
    expect(
      toPayPalInvoice(draft, {
        ...options,
        profile: { ...EMPTY_PROFILE, businessName: "Riya Sharma Design" },
      }).invoicer,
    ).toEqual({ business_name: "Riya Sharma Design" });
  });

  it.each([
    ["Riya", { given_name: "Riya" }],
    ["Mary Anne Jones", { given_name: "Mary Anne", surname: "Jones" }],
  ])("splits the name %j into a given name and a surname", (yourName, name) => {
    const body = toPayPalInvoice(draft, { ...options, profile: { ...EMPTY_PROFILE, yourName } });
    expect(body.invoicer).toEqual({ name });
  });

  it("describes an item with its SAC and keeps the first item's SAC in the private memo", () => {
    const body = toPayPalInvoice(
      {
        ...draft,
        items: draft.items.map((item, index) => ({ ...item, sac: index ? null : "998314" })),
      },
      options,
    );
    expect(body.items[0].description).toBe("SAC 998314");
    expect(body.items[1]).not.toHaveProperty("description");
    expect(body.detail.memo).toBe(`dueline-request:${requestId} purpose:P1099 sac:998314`);
  });

  it("writes the declaration, the LUT ARN and the place of supply when the LUT line is ticked", () => {
    const note = toPayPalInvoice({ ...draft, includeLutNote: true }, { ...options, profile }).detail
      .note;
    expect(note).toBe(
      `${LUT_DECLARATION}\nLUT ARN: AD2904260012345\nPlace of supply: outside India`,
    );
  });

  it("writes no LUT lines when the LUT line is not ticked, even with an ARN saved", () => {
    expect(toPayPalInvoice(draft, { ...options, profile }).detail).not.toHaveProperty("note");
  });
});

describe("mentionsLut", () => {
  it("recognises the declaration and the line older invoices carry", () => {
    expect(mentionsLut(`Thanks\n${LUT_DECLARATION}`)).toBe(true);
    expect(mentionsLut("Export of services under LUT, without payment of IGST")).toBe(true);
    expect(mentionsLut("Thanks")).toBe(false);
    expect(mentionsLut(undefined)).toBe(false);
  });
});
