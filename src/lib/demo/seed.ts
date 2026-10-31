import "server-only";
import { today } from "@/lib/clock";
import { assertSandboxBuyers } from "@/lib/demo-guard";
import { ConfigError, getEnv } from "@/lib/env";
import { PayPalApiError } from "@/lib/paypal/errors";
import { toPayPalInvoice } from "@/lib/paypal/invoice-body";
import {
  createDraftInvoice,
  nextInvoiceNumber,
  recordExternalPayment,
  sendInvoice,
} from "@/lib/paypal/invoices";
import { markerOf } from "@/lib/paypal/memo";
import { listInvoicesInFull } from "@/lib/paypal/summaries";
import type { PayPalInvoice } from "@/lib/paypal/types";
import { buildDemoStory, demoMemo, type DemoInvoice } from "./story";

type SeedResult = "created" | "repaired" | "skipped" | "failed";

export interface SeedRow {
  key: string;
  client: string;
  result: SeedResult;
  invoice?: string;
  note?: string;
}

const SEND_NOTE = "Sandbox demo invoice. No real money moves.";
const PAYMENT_NOTE = "Paid by bank transfer, recorded for the demo history.";
const OPEN_STATUSES = ["SENT", "UNPAID"];

function buyerEmail(): string {
  const email = getEnv().SANDBOX_BUYER_EMAIL;
  if (!email) {
    throw new ConfigError(
      "SANDBOX_BUYER_EMAIL is not set. The demo needs a sandbox buyer address.",
    );
  }
  assertSandboxBuyers([email]);
  return email;
}

async function createDraft(story: DemoInvoice, email: string): Promise<PayPalInvoice> {
  const requestId = crypto.randomUUID();
  const body = toPayPalInvoice(
    {
      client: { name: story.clientName, email },
      currency: story.amount.currency,
      dueOn: story.dueOn,
      items: [{ name: story.work, quantity: 1, unitAmount: story.amount.value }],
      purposeCode: story.purposeCode,
      includeLutNote: false,
    },
    { invoiceNumber: await nextInvoiceNumber(), invoiceDate: story.issuedOn, requestId },
  );
  const marked = {
    ...body,
    detail: { ...body.detail, memo: demoMemo(story.key, story.purposeCode) },
  };
  return createDraftInvoice(marked, requestId);
}

async function send(invoice: PayPalInvoice): Promise<void> {
  await sendInvoice(
    invoice.id,
    { subject: `Invoice ${invoice.detail.invoice_number}`, note: SEND_NOTE },
    crypto.randomUUID(),
  );
}

// A story invoice that is a draft or is open but should be history was left half done by an
// earlier run, so only the missing steps are taken.
async function finish(
  story: DemoInvoice,
  found: PayPalInvoice | undefined,
  email: string,
): Promise<Pick<SeedRow, "result" | "invoice">> {
  const existing = found ?? (await createDraft(story, email));
  let acted = found === undefined;

  if (existing.status === "DRAFT") {
    await send(existing);
    acted = true;
  }
  const open = existing.status === "DRAFT" || OPEN_STATUSES.includes(existing.status);
  if (story.paidOn && open) {
    await recordExternalPayment(existing.id, { paymentDate: story.paidOn, note: PAYMENT_NOTE });
    acted = true;
  }
  const result: SeedResult = found === undefined ? "created" : acted ? "repaired" : "skipped";
  return { result, invoice: existing.detail.invoice_number };
}

function failureNote(error: unknown): string {
  if (error instanceof PayPalApiError) {
    console.error("Seeding a demo invoice failed", { debugId: error.debugId });
    return `PayPal returned an error: ${error.message}`;
  }
  console.error("Seeding a demo invoice failed");
  return error instanceof Error ? error.message : "Unknown error.";
}

// Creates the story's invoices that PayPal does not have yet, one at a time because PayPal hands out
// invoice numbers in order. One failure does not stop the rest, and running it again repairs it.
export async function seedDemo(): Promise<SeedRow[]> {
  const email = buyerEmail();
  const listed = await listInvoicesInFull();
  const rows: SeedRow[] = [];

  for (const story of buildDemoStory(today())) {
    const base = { key: story.key, client: story.clientName };
    const found = listed.find(
      (invoice) =>
        markerOf(invoice.detail.memo) === demoMemo(story.key) && invoice.status !== "CANCELLED",
    );
    try {
      rows.push({ ...base, ...(await finish(story, found, email)) });
    } catch (error) {
      rows.push({ ...base, result: "failed", note: failureNote(error) });
    }
  }
  return rows;
}
