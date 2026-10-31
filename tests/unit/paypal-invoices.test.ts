import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cancelInvoice,
  createDraftInvoice,
  getInvoice,
  listInvoices,
  nextInvoiceNumber,
  recordExternalPayment,
  sendInvoice,
} from "@/lib/paypal/invoices";
import type { PayPalInvoice, PayPalInvoiceInput } from "@/lib/paypal/types";
import { clearAccessToken } from "@/lib/paypal/token";
import { stubEnv } from "../support/env";
import { jsonResponse, mockPayPal } from "../support/http";

function invoice(id: string): PayPalInvoice {
  return {
    id,
    status: "SENT",
    detail: { invoice_number: id, invoice_date: "2026-10-01", currency_code: "USD" },
  };
}

describe("PayPal invoices", () => {
  beforeEach(() => {
    stubEnv();
    clearAccessToken();
  });

  afterEach(() => vi.restoreAllMocks());

  it("follows every page of the list", async () => {
    const spy = mockPayPal((url) => {
      const page = Number(url.searchParams.get("page"));
      return jsonResponse({ items: [invoice(`INV-${page}`)], total_items: 3, total_pages: 3 });
    });
    const invoices = await listInvoices();
    expect(invoices.map((item) => item.id)).toEqual(["INV-1", "INV-2", "INV-3"]);
    expect(String(spy.mock.calls.at(-1)?.[0])).toContain(
      "page=3&page_size=100&total_required=true",
    );
  });

  it("stops after ten pages", async () => {
    const spy = mockPayPal(() => jsonResponse({ items: [], total_pages: 50 }));
    await listInvoices();
    expect(spy.mock.calls).toHaveLength(11);
  });

  it("returns an empty list when PayPal has no invoices", async () => {
    mockPayPal(() => jsonResponse({}));
    expect(await listInvoices()).toEqual([]);
  });

  it("reads the next invoice number", async () => {
    mockPayPal(() => jsonResponse({ invoice_number: "0042" }));
    expect(await nextInvoiceNumber()).toBe("0042");
  });

  it("creates a draft asking for the full representation", async () => {
    const spy = mockPayPal(() => jsonResponse(invoice("INV2-NEW")));
    const body = { detail: {}, primary_recipients: [], items: [] } as unknown as PayPalInvoiceInput;
    const created = await createDraftInvoice(body, "req-1");
    expect(created.id).toBe("INV2-NEW");
    const headers = spy.mock.calls[1][1]?.headers as Record<string, string>;
    expect(headers.Prefer).toBe("return=representation");
    expect(headers["PayPal-Request-Id"]).toBe("req-1");
  });

  it("sends a draft to the recipient", async () => {
    const spy = mockPayPal(() => new Response(null, { status: 202 }));
    await sendInvoice("INV2-NEW", { subject: "Invoice", note: "Thanks" }, "req-2");
    const [url, init] = spy.mock.calls[1];
    expect(String(url)).toContain("/v2/invoicing/invoices/INV2-NEW/send");
    expect(JSON.parse(String(init?.body))).toEqual({
      send_to_invoicer: false,
      send_to_recipient: true,
      subject: "Invoice",
      note: "Thanks",
    });
  });

  it("reads one invoice", async () => {
    mockPayPal(() => jsonResponse(invoice("INV2-1")));
    expect((await getInvoice("INV2-1")).id).toBe("INV2-1");
  });

  it("cancels without emailing anyone unless asked", async () => {
    const spy = mockPayPal(() => new Response(null, { status: 204 }));
    await cancelInvoice("INV2-1");
    await cancelInvoice("INV2-1", { notifyClient: true });

    const bodies = spy.mock.calls.slice(1).map(([, init]) => JSON.parse(String(init?.body)));
    expect(String(spy.mock.calls[1][0])).toContain("/v2/invoicing/invoices/INV2-1/cancel");
    expect(bodies).toEqual([
      { send_to_invoicer: false, send_to_recipient: false },
      { send_to_invoicer: false, send_to_recipient: true },
    ]);
  });

  it("records an external payment by bank transfer unless told another method", async () => {
    const spy = mockPayPal(() => jsonResponse({ payment_id: "EXTR-1" }));
    await recordExternalPayment("INV2-1", { paymentDate: "2026-11-03", note: "Paid" });
    await recordExternalPayment("INV2-1", {
      paymentDate: "2026-11-03",
      note: "Paid",
      method: "WIRE_TRANSFER",
    });

    const bodies = spy.mock.calls.slice(1).map(([, init]) => JSON.parse(String(init?.body)));
    expect(String(spy.mock.calls[1][0])).toContain("/v2/invoicing/invoices/INV2-1/payments");
    expect(bodies.map(({ method, type }) => [method, type])).toEqual([
      ["BANK_TRANSFER", "EXTERNAL"],
      ["WIRE_TRANSFER", "EXTERNAL"],
    ]);
  });
});
