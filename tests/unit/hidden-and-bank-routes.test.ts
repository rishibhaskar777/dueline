import { beforeEach, describe, expect, it, vi } from "vitest";
import { PUT as putBankReference } from "@/app/api/export-register/bank-reference/route";
import { POST as postHidden } from "@/app/api/demo/hidden-invoices/route";
import { PayPalApiError } from "@/lib/paypal/errors";
import { createMemoryStore } from "@/lib/store/memory-store";
import type { Store } from "@/lib/store/store";
import { stubEnv } from "../support/env";

const paypal = vi.hoisted(() => ({ getInvoice: vi.fn(), clearInvoiceCaches: vi.fn() }));
vi.mock("@/lib/paypal/invoices", () => ({ getInvoice: paypal.getInvoice }));
vi.mock("@/lib/paypal/summaries", () => ({ clearInvoiceCaches: paypal.clearInvoiceCaches }));
let store: Store;
vi.mock("@/lib/store", () => ({ getStore: () => store }));

function request(body: unknown): Request {
  return new Request("http://localhost/api", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const notFound = new PayPalApiError({
  status: 404,
  paypalName: "RESOURCE_NOT_FOUND",
  message: "No.",
});

beforeEach(() => {
  store = createMemoryStore();
  stubEnv({});
  paypal.getInvoice.mockReset();
  paypal.clearInvoiceCaches.mockReset();
});

describe("POST /api/demo/hidden-invoices", () => {
  it("hides an invoice and shows it again", async () => {
    paypal.getInvoice.mockResolvedValue({ id: "INV2-A", status: "PAID" });

    const hidden = await postHidden(request({ invoiceId: "INV2-A", hidden: true }));
    expect(hidden.status).toBe(200);
    expect(await hidden.json()).toEqual({ invoiceId: "INV2-A", hidden: true });
    expect(await store.listHiddenInvoices()).toEqual(["INV2-A"]);
    expect(paypal.clearInvoiceCaches).toHaveBeenCalledTimes(1);

    await postHidden(request({ invoiceId: "INV2-A", hidden: false }));
    expect(await store.listHiddenInvoices()).toEqual([]);
  });

  it("is not found for an invoice PayPal does not have", async () => {
    paypal.getInvoice.mockRejectedValue(notFound);

    const response = await postHidden(request({ invoiceId: "INV2-NONE", hidden: true }));

    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe("not_found");
    expect(await store.listHiddenInvoices()).toEqual([]);
  });

  it("is not found outside demo mode", async () => {
    stubEnv({ DEMO_MODE: "false" });

    const response = await postHidden(request({ invoiceId: "INV2-A", hidden: true }));

    expect(response.status).toBe(404);
    expect(paypal.getInvoice).not.toHaveBeenCalled();
  });

  it("refuses a body that is not an invoice id and a boolean", async () => {
    const response = await postHidden(request({ invoiceId: "INV2-A", hidden: "yes" }));
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("invalid_request");
  });
});

describe("PUT /api/export-register/bank-reference", () => {
  it("stores the reference of a payment recorded outside PayPal", async () => {
    paypal.getInvoice.mockResolvedValue({ id: "INV2-B", status: "MARKED_AS_PAID" });

    const response = await putBankReference(
      request({ invoiceId: "INV2-B", reference: " FIRC/26-42 " }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ invoiceId: "INV2-B", reference: "FIRC/26-42" });
    expect(await store.listBankReferences()).toEqual({ "INV2-B": "FIRC/26-42" });
  });

  it("clears the reference when it is empty", async () => {
    paypal.getInvoice.mockResolvedValue({ id: "INV2-B", status: "MARKED_AS_PAID" });
    await store.saveBankReference("INV2-B", "FIRC/26-42");

    const response = await putBankReference(request({ invoiceId: "INV2-B", reference: "" }));

    expect(await response.json()).toEqual({ invoiceId: "INV2-B", reference: null });
    expect(await store.listBankReferences()).toEqual({});
  });

  it.each(["has space", "semi;colon", "=1+1", "a".repeat(41)])(
    "refuses the reference %j in plain words, without the field name",
    async (reference) => {
      const response = await putBankReference(request({ invoiceId: "INV2-B", reference }));
      expect(response.status).toBe(400);
      expect((await response.json()).error.message).toBe(
        "Use letters, digits, / and - only, up to 40 characters.",
      );
      expect(paypal.getInvoice).not.toHaveBeenCalled();
    },
  );

  it("accepts the longest reference of letters, digits, slashes and dashes", async () => {
    paypal.getInvoice.mockResolvedValue({ id: "INV2-B", status: "MARKED_AS_PAID" });
    const reference = `${"A1/-".repeat(10)}`;

    const response = await putBankReference(request({ invoiceId: "INV2-B", reference }));

    expect(response.status).toBe(200);
  });

  it("is not found for an unknown invoice", async () => {
    paypal.getInvoice.mockRejectedValue(notFound);
    const response = await putBankReference(request({ invoiceId: "INV2-NONE", reference: "X1" }));
    expect(response.status).toBe(404);
  });

  it("refuses an invoice paid through PayPal, which is proved by PayPal's FIRA", async () => {
    paypal.getInvoice.mockResolvedValue({ id: "INV2-C", status: "PAID" });

    const response = await putBankReference(request({ invoiceId: "INV2-C", reference: "X1" }));

    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("invalid_state");
    expect(await store.listBankReferences()).toEqual({});
  });
});
