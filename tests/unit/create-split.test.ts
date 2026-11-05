import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDepositAndBalance } from "@/lib/invoices/create-split";
import { InvalidActionError } from "@/lib/invoices/errors";
import { RecipientNotAllowedError } from "@/lib/demo-guard";
import { PayPalApiError, PayPalTimeoutError } from "@/lib/paypal/errors";
import { DuplicateRequestError } from "@/lib/requests/errors";
import { splitOf } from "@/lib/paypal/memo";
import type { PayPalInvoice, PayPalInvoiceInput } from "@/lib/paypal/types";
import { createMemoryStore } from "@/lib/store/memory-store";
import type { Store } from "@/lib/store/store";
import type { CreateSplitRequest } from "@/types";
import { stubEnv } from "../support/env";
import unpaidFixture from "../fixtures/paypal/invoice-unpaid.json";

const paypal = vi.hoisted(() => ({
  nextInvoiceNumber: vi.fn(),
  createDraftInvoice: vi.fn(),
  sendInvoice: vi.fn(),
  getInvoice: vi.fn(),
  findInvoiceByMemo: vi.fn(),
  refreshSnapshotNow: vi.fn(),
}));

vi.mock("@/lib/paypal/invoices", () => ({
  nextInvoiceNumber: paypal.nextInvoiceNumber,
  createDraftInvoice: paypal.createDraftInvoice,
  sendInvoice: paypal.sendInvoice,
  getInvoice: paypal.getInvoice,
}));
vi.mock("@/lib/paypal/summaries", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/paypal/summaries")>()),
  findInvoiceByMemo: paypal.findInvoiceByMemo,
  refreshSnapshotNow: paypal.refreshSnapshotNow,
}));

let store: Store;
vi.mock("@/lib/store", () => ({ getStore: () => store }));

const requestId = "3f2b8c1e-6a4d-4e8b-9c1a-2d5e7f9a0b1c";
const balanceRequestId = "9a1c7e52-0b3d-4f6a-8d2e-5c4b3a291807";

const input: Omit<CreateSplitRequest, "requestId" | "balanceRequestId"> = {
  draft: {
    client: {
      name: "Kraftwerk Studio",
      email: "buyer@personal.example.com",
      contactName: "Lena Weiss",
    },
    currency: "EUR",
    dueOn: "2026-11-30",
    items: [
      { name: "Logo final files", quantity: 1, unitAmount: "400.00", sac: "998314" },
      { name: "Business card designs", quantity: 2, unitAmount: "90.00", sac: "998314" },
      { name: "Brand guideline PDF", quantity: 1, unitAmount: "650.00", sac: "998314" },
    ],
    purposeCode: "P1007",
    includeLutNote: false,
  },
  split: { percent: 50, depositDueOn: "2026-11-06", balanceDueOn: "2026-11-30" },
};

const base = unpaidFixture as PayPalInvoice;
let created: PayPalInvoice[] = [];

function bodies(): PayPalInvoiceInput[] {
  return paypal.createDraftInvoice.mock.calls.map(([body]) => body as PayPalInvoiceInput);
}

function rejection(): PayPalApiError {
  return new PayPalApiError({ status: 422, paypalName: "ERROR", message: "No.", debugId: "d1" });
}

beforeEach(() => {
  store = createMemoryStore();
  stubEnv({ DEMO_TODAY: "2026-11-04" });
  vi.resetAllMocks();
  created = [];
  let counter = 0;
  paypal.nextInvoiceNumber.mockImplementation(async () => `INV-01${++counter}`);
  paypal.createDraftInvoice.mockImplementation(async (body: PayPalInvoiceInput) => {
    const invoice: PayPalInvoice = {
      ...base,
      id: `INV2-${created.length}`,
      status: "DRAFT",
      detail: { ...base.detail, invoice_number: `INV-01${created.length}`, memo: body.detail.memo },
    };
    created.push(invoice);
    return invoice;
  });
  paypal.sendInvoice.mockResolvedValue(undefined);
  paypal.getInvoice.mockImplementation(async (id: string) => {
    const found = created.find((invoice) => invoice.id === id);
    if (!found) throw new Error("unknown");
    return { ...found, status: "SENT" };
  });
  paypal.findInvoiceByMemo.mockResolvedValue(undefined);
});

// A test that fails before it restores the clock must not leave a frozen one for the next test.
afterEach(() => vi.useRealTimers());

describe("createDepositAndBalance", () => {
  it("sends the deposit and saves the balance as an unsent draft, linked by one id", async () => {
    const result = await createDepositAndBalance(input, requestId, balanceRequestId);

    expect(result.deposit.sent).toBe(true);
    expect(result.balance).toMatchObject({ id: "INV2-1", paypalStatus: "DRAFT" });
    expect(paypal.sendInvoice).toHaveBeenCalledTimes(1);
    expect(paypal.sendInvoice).toHaveBeenCalledWith("INV2-0", expect.any(String));

    const [deposit, balance] = bodies();
    expect(deposit.items).toHaveLength(1);
    expect(deposit.items[0]).toMatchObject({
      unit_amount: { value: "615.00" },
      description: "SAC 998314",
    });
    expect(balance.items[0]).toMatchObject({ unit_amount: { value: "615.00" } });
    expect(deposit.detail.payment_term.due_date).toBe("2026-11-06");
    expect(balance.detail.payment_term.due_date).toBe("2026-11-30");
    expect(splitOf(deposit.detail.memo)).toEqual({ role: "deposit", id: requestId });
    expect(splitOf(balance.detail.memo)).toEqual({ role: "balance", id: requestId });
    expect(deposit.primary_recipients[0].billing_info.name).toEqual({
      given_name: "Lena",
      surname: "Weiss",
    });
    expect(balance.primary_recipients[0].billing_info.name).toEqual({
      given_name: "Lena",
      surname: "Weiss",
    });
    expect(balance.detail.note).toContain("invoiced on INV-010");
  });

  it("keeps the deposit and offers a retry when the balance cannot be saved, then makes only the balance", async () => {
    paypal.createDraftInvoice.mockImplementationOnce(
      async (body: PayPalInvoiceInput): Promise<PayPalInvoice> => {
        const invoice: PayPalInvoice = {
          ...base,
          id: "INV2-0",
          status: "DRAFT",
          detail: { ...base.detail, invoice_number: "INV-010", memo: body.detail.memo },
        };
        created.push(invoice);
        return invoice;
      },
    );
    paypal.createDraftInvoice.mockRejectedValueOnce(rejection());

    const first = await createDepositAndBalance(input, requestId, balanceRequestId);
    expect(first.deposit.sent).toBe(true);
    expect(first.balance).toBeNull();
    expect(paypal.createDraftInvoice).toHaveBeenCalledTimes(2);

    const second = await createDepositAndBalance(input, requestId, balanceRequestId);
    expect(second.balance).toMatchObject({ paypalStatus: "DRAFT" });
    // The deposit was replayed, not made again: one more create, for the balance only.
    expect(paypal.createDraftInvoice).toHaveBeenCalledTimes(3);
    expect(paypal.sendInvoice).toHaveBeenCalledTimes(1);
    expect(splitOf(bodies()[2].detail.memo)?.role).toBe("balance");
  });

  it("replays both from their stored results for the same requests", async () => {
    const first = await createDepositAndBalance(input, requestId, balanceRequestId);
    vi.clearAllMocks();
    expect(await createDepositAndBalance(input, requestId, balanceRequestId)).toEqual(first);
    expect(paypal.createDraftInvoice).not.toHaveBeenCalled();
  });

  it("does not save a balance while the deposit is only a draft", async () => {
    paypal.sendInvoice.mockRejectedValue(rejection());
    const result = await createDepositAndBalance(input, requestId, balanceRequestId);
    expect(result.deposit.sent).toBe(false);
    expect(result.balance).toBeNull();
    expect(paypal.createDraftInvoice).toHaveBeenCalledTimes(1);
  });

  it("refuses a split where a part would be under one cent", async () => {
    const tiny = {
      ...input,
      draft: {
        ...input.draft,
        items: [{ ...input.draft.items[0], unitAmount: "0.01", quantity: 1 }],
      },
    };
    await expect(createDepositAndBalance(tiny, requestId, balanceRequestId)).rejects.toBeInstanceOf(
      InvalidActionError,
    );
    expect(paypal.createDraftInvoice).not.toHaveBeenCalled();
  });
});

describe("a double click and a retry after a timeout", () => {
  it("makes one deposit and one balance when the same request arrives twice at once", async () => {
    const results = await Promise.allSettled([
      createDepositAndBalance(input, requestId, balanceRequestId),
      createDepositAndBalance(input, requestId, balanceRequestId),
    ]);

    expect(results.filter(({ status }) => status === "fulfilled")).toHaveLength(1);
    const refused = results.find(({ status }) => status === "rejected");
    expect(refused).toMatchObject({ reason: expect.any(DuplicateRequestError) });
    expect(paypal.createDraftInvoice).toHaveBeenCalledTimes(2);
    expect(paypal.sendInvoice).toHaveBeenCalledTimes(1);
  });

  it("finds the balance PayPal made before a timeout instead of making a second one", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-04T05:00:00Z"));
    const makeDraft = paypal.createDraftInvoice.getMockImplementation();
    if (!makeDraft) throw new Error("no implementation");
    paypal.createDraftInvoice.mockImplementationOnce(makeDraft);
    paypal.createDraftInvoice.mockImplementationOnce(async (body: PayPalInvoiceInput) => {
      await makeDraft(body);
      throw new PayPalTimeoutError();
    });
    paypal.findInvoiceByMemo.mockImplementation(async (memo: string) =>
      created.find((invoice) => invoice.detail.memo?.startsWith(memo)),
    );

    const first = await createDepositAndBalance(input, requestId, balanceRequestId);
    expect(first.deposit.sent).toBe(true);
    expect(first.balance).toBeNull();
    expect(created).toHaveLength(2);

    // Straight away the balance is still being resolved; once the claim has gone stale it is found.
    await expect(
      createDepositAndBalance(input, requestId, balanceRequestId),
    ).rejects.toBeInstanceOf(DuplicateRequestError);
    vi.setSystemTime(new Date("2026-11-04T05:05:00Z"));
    const second = await createDepositAndBalance(input, requestId, balanceRequestId);

    expect(second.balance).toMatchObject({ id: "INV2-1", paypalStatus: "DRAFT" });
    expect(created).toHaveLength(2);
  });

  it("sends nothing to an address that is not a sandbox buyer", async () => {
    const outsider = {
      ...input,
      draft: { ...input.draft, client: { ...input.draft.client, email: "client@acme.example" } },
    };
    await expect(
      createDepositAndBalance(outsider, requestId, balanceRequestId),
    ).rejects.toBeInstanceOf(RecipientNotAllowedError);
    expect(paypal.nextInvoiceNumber).not.toHaveBeenCalled();
    expect(paypal.createDraftInvoice).not.toHaveBeenCalled();
    expect(paypal.sendInvoice).not.toHaveBeenCalled();
  });
});
