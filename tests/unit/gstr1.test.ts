import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/exports/gstr1/route";
import { buildGstr1 } from "@/lib/export/gstr1";
import { gstDate, toGstr1Csv } from "@/lib/export/gstr1-csv";
import type { LoadedInvoice } from "@/lib/paypal/summaries";
import { createMemoryStore } from "@/lib/store/memory-store";
import type { Store } from "@/lib/store/store";
import { haldenLabelsInvoice, okaforInvoice } from "@/mocks/fixtures";
import type { InvoiceSummary } from "@/types";
import { stubEnv } from "../support/env";
import { ecbByDate } from "../support/ecb-by-date";

const holder = vi.hoisted(() => ({ store: undefined as Store | undefined }));
const paypal = vi.hoisted(() => ({ loadInvoices: vi.fn() }));
vi.mock("@/lib/store", () => ({ getStore: () => holder.store }));
vi.mock("@/lib/paypal/summaries", () => ({ loadInvoices: paypal.loadInvoices }));

function loaded(summary: InvoiceSummary, underLut = false): LoadedInvoice {
  return {
    summary,
    amountDue: summary.amount,
    underLut,
    sac: null,
    paymentId: null,
    marker: "dueline-request:test",
  };
}

function invoice(overrides: Partial<InvoiceSummary>): InvoiceSummary {
  return { ...okaforInvoice, ...overrides };
}

function serve(...invoices: LoadedInvoice[]): void {
  paypal.loadInvoices.mockResolvedValue(invoices);
}

function lines(csv: string): string[] {
  return csv.replace(/^﻿/, "").split("\r\n");
}

beforeEach(() => {
  stubEnv({ DEMO_TODAY: "2026-10-30" });
  holder.store = createMemoryStore();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  // USD is 85 on 5 October and 90 on 20 October.
  vi.spyOn(globalThis, "fetch").mockImplementation(
    ecbByDate({ "2026-10-05": 102, "2026-10-20": 108 }),
  );
});

afterEach(() => vi.restoreAllMocks());

describe("buildGstr1", () => {
  it("lists the invoices issued in the month, paid or not, and none issued in another", async () => {
    serve(
      loaded(invoice({ id: "a", number: "INV-0010", issuedOn: "2026-10-01" })),
      loaded(invoice({ id: "b", number: "INV-0011", issuedOn: "2026-10-31" })),
      loaded(invoice({ id: "c", number: "INV-0009", issuedOn: "2026-09-30" })),
      loaded(invoice({ id: "d", number: "INV-0012", issuedOn: "2026-11-01" })),
      loaded({ ...haldenLabelsInvoice, issuedOn: "2026-09-15", paidOn: "2026-10-15" }),
    );

    const rows = await buildGstr1("2026-10");
    expect(rows.map((row) => row.invoiceNumber)).toEqual(["INV-0010", "INV-0011"]);
  });

  it("marks an invoice under LUT as WOPAY at rate 0, and any other as WPAY at rate 18", async () => {
    serve(
      loaded(invoice({ id: "a", number: "INV-0010", issuedOn: "2026-10-05" }), true),
      loaded(invoice({ id: "b", number: "INV-0011", issuedOn: "2026-10-05" }), false),
    );

    const rows = await buildGstr1("2026-10");
    expect(rows.map(({ exportType, rate }) => [exportType, rate])).toEqual([
      ["WOPAY", 0],
      ["WPAY", 18],
    ]);
  });

  it("converts to the paisa at the ECB rate of the invoice date, not of the payment or today", async () => {
    serve(
      loaded(
        invoice({
          id: "a",
          number: "INV-0010",
          issuedOn: "2026-10-05",
          amount: { currency: "USD", value: "450.00" },
          paidOn: "2026-10-20",
        }),
      ),
      loaded(
        invoice({
          id: "b",
          number: "INV-0011",
          issuedOn: "2026-10-20",
          amount: { currency: "USD", value: "10.01" },
        }),
      ),
    );

    const rows = await buildGstr1("2026-10");
    expect(rows.map((row) => row.valuePaise)).toEqual([3_825_000, 90_090]);
  });

  it("sorts by invoice date, then invoice number as a number", async () => {
    serve(
      loaded(invoice({ id: "a", number: "INV-0100", issuedOn: "2026-10-05" })),
      loaded(invoice({ id: "b", number: "INV-0020", issuedOn: "2026-10-05" })),
      loaded(invoice({ id: "c", number: "INV-0300", issuedOn: "2026-10-02" })),
    );
    expect((await buildGstr1("2026-10")).map((row) => row.invoiceNumber)).toEqual([
      "INV-0300",
      "INV-0020",
      "INV-0100",
    ]);
  });
});

describe("toGstr1Csv", () => {
  const row = {
    exportType: "WOPAY" as const,
    invoiceNumber: "INV-0010",
    invoiceDate: "2026-10-05",
    valuePaise: 3_825_000,
    rate: 0 as const,
  };

  it("writes the exp sheet columns, with port, shipping bill and cess blank", () => {
    const csv = lines(toGstr1Csv([row]));
    expect(csv[0]).toBe(
      "Export Type,Invoice Number,Invoice date,Invoice Value,Port Code,Shipping Bill Number,Shipping Bill Date,Rate,Taxable Value,Cess Amount",
    );
    expect(csv[1]).toBe("WOPAY,INV-0010,05-Oct-2026,38250.00,,,,0,38250.00,");
  });

  it("starts with a byte order mark and says it is an estimate", () => {
    const csv = toGstr1Csv([row]);
    expect(csv.startsWith("﻿Export Type,")).toBe(true);
    expect(lines(csv).slice(2)).toEqual([
      "",
      "Estimate. Confirm with your CA. Rupee values use the ECB rate of the invoice date; the GST rule uses the RBI reference rate.",
      "",
    ]);
  });

  it("protects an invoice number a spreadsheet would run as a formula", () => {
    const csv = toGstr1Csv([{ ...row, invoiceNumber: "=1+1" }]);
    expect(lines(csv)[1]).toContain(",'=1+1,");
  });

  it.each([
    ["2026-01-09", "09-Jan-2026"],
    ["2026-09-30", "30-Sep-2026"],
    ["2027-03-31", "31-Mar-2027"],
  ])("writes %s as %s", (date, text) => {
    expect(gstDate(date)).toBe(text);
  });
});

describe("GET /api/exports/gstr1", () => {
  function get(query: string): Promise<Response> {
    return GET(new Request(`http://localhost:3000/api/exports/gstr1?${query}`));
  }

  it("sends the rows as a CSV attachment", async () => {
    serve(loaded(invoice({ id: "a", number: "INV-0010", issuedOn: "2026-10-05" }), true));
    const response = await get("month=2026-10&format=csv");

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="dueline-gstr1-2026-10.csv"',
    );
    expect(lines(await response.text())[1]).toMatch(/^WOPAY,INV-0010,05-Oct-2026,/);
  });

  it("refuses a month after the current one", async () => {
    const response = await get("month=2026-11&format=csv");
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("invalid_request");
  });

  it.each(["month=2026-13", "month=2026-10&format=json", ""])("refuses the query %j", async (q) => {
    expect((await get(q)).status).toBe(400);
  });
});
