import { describe, expect, it } from "vitest";
import { extraction } from "@/mocks/fixtures";
import {
  createInvoiceRequestSchema,
  extractRequestSchema,
  invoiceDraftSchema,
  lineItemSchema,
  moneySchema,
  sendInvoiceRequestSchema,
} from "@/types";

const requestId = "3f2b8c1e-6a4d-4e8b-9c1a-2d5e7f9a0b1c";

describe("request schemas", () => {
  it("rejects a chat over 6,000 characters and accepts exactly 6,000", () => {
    expect(extractRequestSchema.safeParse({ chat: "a".repeat(6001) }).success).toBe(false);
    expect(extractRequestSchema.safeParse({ chat: "a".repeat(6000) }).success).toBe(true);
  });

  it("rejects an empty chat", () => {
    expect(extractRequestSchema.safeParse({ chat: "" }).success).toBe(false);
  });

  it("rejects quantity 0", () => {
    const item = { name: "Logo", quantity: 0, unitAmount: "10.00" };
    expect(lineItemSchema.safeParse(item).success).toBe(false);
  });

  it("rejects an amount with 3 decimals", () => {
    expect(moneySchema.safeParse({ currency: "USD", value: "10.005" }).success).toBe(false);
  });

  it("rejects a zero amount", () => {
    expect(moneySchema.safeParse({ currency: "USD", value: "0.00" }).success).toBe(false);
  });

  it("rejects a requestId that is not a UUID", () => {
    expect(sendInvoiceRequestSchema.safeParse({ requestId: "abc" }).success).toBe(false);
    expect(sendInvoiceRequestSchema.safeParse({ requestId }).success).toBe(true);
  });

  it("allows a null dueOn in a draft but not when creating an invoice", () => {
    const draft = { ...extraction.draft, dueOn: null };
    expect(invoiceDraftSchema.safeParse(draft).success).toBe(true);
    expect(createInvoiceRequestSchema.safeParse({ draft, requestId }).success).toBe(false);
  });

  it("rejects an unknown purpose code", () => {
    const draft = { ...extraction.draft, purposeCode: "P9999" };
    expect(invoiceDraftSchema.safeParse(draft).success).toBe(false);
  });
});
