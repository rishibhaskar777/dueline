import "server-only";
import { PayPalApiError } from "@/lib/paypal/errors";
import { assertSandboxBuyers } from "@/lib/demo-guard";
import type { CreateInvoiceResponse, CreateSplitRequest, CreateSplitResponse } from "@/types";
import { createAndSendInvoice, createDraftOnly } from "./create-invoice";
import { CreateOutcomeUnknownError, InvalidActionError } from "./errors";
import { balanceDraft, depositDraft, planSplit } from "./split-drafts";

type SplitInput = Omit<CreateSplitRequest, "requestId" | "balanceRequestId">;

// The balance is saved after the deposit went out, so a failure here must not hide the deposit:
// the answer says the balance is missing and the same request, sent again, makes only the balance.
function balanceCouldNotBeSaved(error: unknown): boolean {
  return error instanceof PayPalApiError || error instanceof CreateOutcomeUnknownError;
}

export async function createDepositAndBalance(
  { draft, split }: SplitInput,
  requestId: string,
  balanceRequestId: string,
): Promise<CreateSplitResponse> {
  const plan = planSplit(draft, split.percent);
  if (!plan) {
    throw new InvalidActionError("The deposit and the balance must each be at least one cent.");
  }
  assertSandboxBuyers([draft.client.email]);

  // The deposit's request ID names the pair, so both memos carry the same id.
  const deposit: CreateInvoiceResponse = await createAndSendInvoice(
    {
      draft: depositDraft(draft, plan, split.depositDueOn),
      split: { role: "deposit", id: requestId },
    },
    requestId,
  );
  if (!deposit.sent) return { deposit, balance: null };

  try {
    const saved = await createDraftOnly(
      {
        draft: balanceDraft(draft, plan, split.balanceDueOn, deposit.invoice.number),
        split: { role: "balance", id: requestId },
      },
      balanceRequestId,
    );
    return { deposit, balance: saved.invoice };
  } catch (error) {
    if (balanceCouldNotBeSaved(error)) return { deposit, balance: null };
    throw error;
  }
}
