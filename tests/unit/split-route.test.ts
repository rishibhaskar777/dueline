import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as createSplit } from "@/app/api/invoices/split/route";
import { InvalidActionError } from "@/lib/invoices/errors";
import { extraction, haldenLabelsInvoice } from "@/mocks/fixtures";
import { stubEnv } from "../support/env";

const service = vi.hoisted(() => ({ createDepositAndBalance: vi.fn() }));
vi.mock("@/lib/invoices/create-split", () => service);

const requestId = "3f2b8c1e-6a4d-4e8b-9c1a-2d5e7f9a0b1c";
const balanceRequestId = "9a1c7e52-0b3d-4f6a-8d2e-5c4b3a291807";
const split = { percent: 50, depositDueOn: "2026-11-06", balanceDueOn: "2026-11-30" };

function post(changes: Record<string, unknown> = {}): Request {
  return new Request("http://localhost:3000/api/invoices/split", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      draft: extraction.draft,
      requestId,
      balanceRequestId,
      split,
      ...changes,
    }),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  stubEnv({ DEMO_TODAY: "2026-11-04" });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("POST /api/invoices/split", () => {
  it("creates the deposit and the balance for a valid request", async () => {
    const stored = {
      deposit: { invoice: haldenLabelsInvoice, sent: true },
      balance: haldenLabelsInvoice,
    };
    service.createDepositAndBalance.mockResolvedValue(stored);

    const response = await createSplit(post());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(stored);
    expect(service.createDepositAndBalance).toHaveBeenCalledWith(
      { draft: extraction.draft, split },
      requestId,
      balanceRequestId,
    );
  });

  it.each([
    ["a percent of 0", { split: { ...split, percent: 0 } }],
    ["a percent of 100", { split: { ...split, percent: 100 } }],
    ["a fractional percent", { split: { ...split, percent: 12.5 } }],
    ["a missing balance request ID", { balanceRequestId: undefined }],
    ["a deposit date in the past", { split: { ...split, depositDueOn: "2026-11-03" } }],
    ["a balance date in the past", { split: { ...split, balanceDueOn: "2026-11-03" } }],
  ])("refuses %s", async (_name, changes) => {
    const response = await createSplit(post(changes));
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("invalid_request");
    expect(service.createDepositAndBalance).not.toHaveBeenCalled();
  });

  it("answers a part under one cent as an invalid request", async () => {
    service.createDepositAndBalance.mockRejectedValue(new InvalidActionError("Too small."));
    const response = await createSplit(post());
    expect(response.status).toBe(400);
    expect((await response.json()).error.message).toBe("Too small.");
  });
});
