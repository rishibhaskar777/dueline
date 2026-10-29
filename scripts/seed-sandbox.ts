import { getEnv } from "@/lib/env";
import { listInvoices } from "@/lib/paypal/invoices";
import { daysBetween } from "@/lib/clock";
import {
  brightwellInvoice,
  northpineInvoice,
  okaforInvoice,
  tandemInvoice,
} from "@/mocks/fixtures";
import type { InvoiceSummary } from "@/types";
import { createAndSendSandboxInvoice } from "./sandbox-invoice";
import { reportFailure } from "./report-failure";

const SEED_INVOICES: InvoiceSummary[] = [
  brightwellInvoice,
  okaforInvoice,
  northpineInvoice,
  tandemInvoice,
];

interface Outcome {
  client: string;
  result: "created" | "skipped";
  invoice: string;
}

async function main(): Promise<void> {
  const email = getEnv().SANDBOX_BUYER_EMAIL;
  if (!email)
    throw new Error("Set SANDBOX_BUYER_EMAIL in .env.local to the sandbox buyer address.");

  const existing = await listInvoices();
  const outcomes: Outcome[] = [];

  for (const seed of SEED_INVOICES) {
    const duplicate = existing.find(
      (invoice) =>
        invoice.detail.reference === seed.purposeCode && invoice.items?.[0]?.name === seed.work,
    );
    if (duplicate) {
      outcomes.push({
        client: seed.client.name,
        result: "skipped",
        invoice: duplicate.detail.invoice_number,
      });
      continue;
    }

    const { invoice } = await createAndSendSandboxInvoice({
      clientName: seed.client.name,
      email,
      currency: seed.amount.currency,
      amount: seed.amount.value,
      itemName: seed.work,
      reference: seed.purposeCode ?? "",
      invoiceDate: seed.issuedOn,
      dueDate: seed.dueOn,
      fallbackTermDays: daysBetween(seed.issuedOn, seed.dueOn),
    });
    outcomes.push({
      client: seed.client.name,
      result: "created",
      invoice: invoice.detail.invoice_number,
    });
  }

  console.table(outcomes);
}

main().catch(reportFailure);
