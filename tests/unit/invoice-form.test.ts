import { describe, expect, it } from "vitest";
import {
  blankForm,
  calculateTotals,
  describeHeld,
  fieldErrorsFromServer,
  formFromDraft,
  lineTotal,
  toRequest,
  type FormItem,
  type InvoiceForm,
} from "@/components/invoices/invoice-form";
import { extraction } from "@/mocks/fixtures";

const requestId = "3f2b8c1e-6a4d-4e8b-9c1a-2d5e7f9a0b1c";

function item(overrides: Partial<FormItem> = {}): FormItem {
  return { key: "k", name: "Logo design", quantity: "3", unitAmount: "120.00", ...overrides };
}

function filled(overrides: Partial<InvoiceForm> = {}): InvoiceForm {
  return {
    ...blankForm(),
    clientName: "Halden Coffee Co.",
    clientEmail: "mike@haldencoffee.example",
    dueOn: "2026-11-30",
    items: [item(), item({ key: "k2", name: "Revision round", quantity: "2", unitAmount: "45" })],
    ...overrides,
  };
}

describe("formFromDraft", () => {
  it("turns a draft into text fields, keeping the words each item came from", () => {
    const form = formFromDraft(extraction.draft);
    expect(form).toMatchObject({
      clientName: "Halden Coffee Co.",
      clientEmail: "mike@haldencoffee.example",
      currency: "USD",
      dueOn: "2026-11-13",
      purposeCode: "P1099",
      includeLutNote: true,
      discountOn: false,
      discountPercent: "2",
      discountDays: "7",
    });
    expect(form.items[0]).toMatchObject({
      name: "Logo concept",
      quantity: "3",
      unitAmount: "120.00",
      sourceQuote: "Need 3 logo options ... Logos for $120 each",
    });
  });

  it("leaves the due date empty when the stated date was in the past", () => {
    expect(formFromDraft({ ...extraction.draft, dueOn: null }).dueOn).toBe("");
  });
});

describe("totals", () => {
  it("multiplies each line in minor units and adds them up", () => {
    expect(lineTotal(item(), "USD")).toEqual({ currency: "USD", value: "360.00" });
    expect(calculateTotals(filled())).toEqual({
      subtotal: { currency: "USD", value: "450.00" },
      discount: null,
      total: { currency: "USD", value: "450.00" },
    });
  });

  it("takes the early-payment discount off the subtotal", () => {
    const totals = calculateTotals(
      filled({ discountOn: true, discountPercent: "2", discountDays: "7" }),
    );
    expect(totals).toEqual({
      subtotal: { currency: "USD", value: "450.00" },
      discount: { currency: "USD", value: "9.00" },
      total: { currency: "USD", value: "441.00" },
    });
  });

  it("rounds a discount to the nearest cent", () => {
    const totals = calculateTotals(
      filled({
        items: [item({ quantity: "1", unitAmount: "33.33" })],
        discountOn: true,
        discountPercent: "2.5",
      }),
    );
    expect(totals?.discount?.value).toBe("0.83");
    expect(totals?.total.value).toBe("32.50");
  });

  it("ignores a discount that is out of range", () => {
    const totals = calculateTotals(filled({ discountOn: true, discountPercent: "30" }));
    expect(totals?.discount).toBeNull();
  });

  it("has no total until every item has a quantity and a price", () => {
    expect(calculateTotals(filled({ items: [item({ unitAmount: "" })] }))).toBeNull();
    expect(calculateTotals(filled({ items: [item({ quantity: "0" })] }))).toBeNull();
    expect(calculateTotals(filled({ items: [item({ quantity: "1.5" })] }))).toBeNull();
    expect(calculateTotals(filled({ items: [item({ unitAmount: "-5" })] }))).toBeNull();
    expect(calculateTotals(filled({ items: [] }))).toBeNull();
    expect(lineTotal(item({ unitAmount: "abc" }), "USD")).toBeNull();
  });
});

describe("toRequest", () => {
  it("builds the request the server expects and leaves out what is blank", () => {
    const result = toRequest(filled({ purposeCode: "P1099" }), requestId, "2026-10-30");
    expect(result).toEqual({
      ok: true,
      request: {
        draft: {
          client: { name: "Halden Coffee Co.", email: "mike@haldencoffee.example" },
          currency: "USD",
          dueOn: "2026-11-30",
          items: [
            { name: "Logo design", quantity: 3, unitAmount: "120.00" },
            { name: "Revision round", quantity: 2, unitAmount: "45" },
          ],
          purposeCode: "P1099",
          includeLutNote: false,
        },
        requestId,
      },
    });
  });

  it("includes the note and the discount when they are set", () => {
    const result = toRequest(
      filled({ note: " Thanks! ", discountOn: true, discountPercent: "3", discountDays: "10" }),
      requestId,
    );
    expect(result.ok && result.request).toMatchObject({
      draft: { note: "Thanks!" },
      discount: { percent: 3, withinDays: 10 },
    });
  });

  it("names each field that needs fixing", () => {
    const result = toRequest(
      filled({
        clientName: " ",
        clientEmail: "mike",
        dueOn: "",
        items: [item({ name: "", quantity: "0", unitAmount: "12.345" })],
        discountOn: true,
        discountPercent: "50",
        discountDays: "1",
      }),
      requestId,
    );
    expect(result).toEqual({
      ok: false,
      errors: {
        "client.name": "Enter the client's name",
        "client.email": "Enter the client's email address",
        dueOn: "Choose a due date",
        "items.0.name": "Enter an item name",
        "items.0.quantity": "Use a whole number from 1 to 999",
        "items.0.unitAmount": "must be a number with at most 2 decimals",
        "discount.percent": "Use a percentage from 1 to 20",
        "discount.withinDays": "Use a whole number of days from 3 to 30",
      },
    });
  });

  it("asks for at least one item", () => {
    const result = toRequest(filled({ items: [] }), requestId);
    expect(result).toEqual({ ok: false, errors: { items: "Add at least one item" } });
  });

  it("refuses a due date before today when today is known", () => {
    const result = toRequest(filled({ dueOn: "2026-10-29" }), requestId, "2026-10-30");
    expect(result).toEqual({ ok: false, errors: { dueOn: "Choose today or a later date" } });
    expect(toRequest(filled({ dueOn: "2026-10-30" }), requestId, "2026-10-30").ok).toBe(true);
  });
});

describe("describeHeld", () => {
  it("tells the user to create another invoice when the form was edited after a hold", () => {
    const notice = describeHeld("duplicate_request", "Still being created.", true);
    expect(notice.message).toBe(
      "These details changed after the invoice was submitted. Check Receivables first. To send a different invoice, click Create another.",
    );
    expect(notice.createAnother).toBe(true);
  });

  it("keeps the server message when the form is unchanged", () => {
    expect(describeHeld("duplicate_request", "Still being created.", false)).toEqual({
      message: "Still being created.",
      createAnother: false,
    });
  });

  it("keeps the server message for a timeout even after an edit", () => {
    expect(describeHeld("paypal_timeout", "PayPal did not answer in time.", true)).toEqual({
      message: "PayPal did not answer in time.",
      createAnother: false,
    });
  });
});

describe("fieldErrorsFromServer", () => {
  it("turns a server message into a field error", () => {
    expect(fieldErrorsFromServer("draft.client.email: Invalid email address")).toEqual({
      "client.email": "Enter the client's email address",
    });
    expect(fieldErrorsFromServer("draft.items.1.unitAmount: must be greater than zero")).toEqual({
      "items.1.unitAmount": "must be greater than zero",
    });
  });

  it("recognises the due date rule", () => {
    expect(fieldErrorsFromServer("dueOn must be today or later")).toEqual({
      dueOn: "Choose today or a later date",
    });
  });

  it("gives up on a message that names no field", () => {
    expect(fieldErrorsFromServer("The request body must be JSON.")).toBeNull();
  });
});
