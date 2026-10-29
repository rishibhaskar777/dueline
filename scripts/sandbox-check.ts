import { parseArgs } from "node:util";
import { getEnv } from "@/lib/env";
import { getInvoice } from "@/lib/paypal/invoices";
import { getActualPayout } from "@/lib/paypal/payments";
import { createAndSendSandboxInvoice } from "./sandbox-invoice";
import { reportFailure } from "./report-failure";

async function createAndSend(): Promise<void> {
  const email = getEnv().SANDBOX_BUYER_EMAIL;
  if (!email)
    throw new Error("Set SANDBOX_BUYER_EMAIL in .env.local to the sandbox buyer address.");

  const { invoice, pastDatesAccepted } = await createAndSendSandboxInvoice({
    clientName: "Sandbox check",
    email,
    currency: "USD",
    amount: "100.00",
    itemName: "Sandbox check",
    reference: "P0802",
    invoiceDate: "2026-10-01",
    dueDate: "2026-10-10",
    fallbackTermDays: 14,
  });
  const sent = await getInvoice(invoice.id);

  console.log(`Invoice id: ${sent.id}`);
  console.log(`Invoice number: ${sent.detail.invoice_number}`);
  console.log(`Status: ${sent.status}`);
  console.log(`Past dates accepted: ${pastDatesAccepted ? "yes" : "no"}`);
  console.log(`Payer link: ${sent.detail.metadata?.recipient_view_url ?? "not reported"}`);
  console.log(
    `\nOpen the payer link in a private window, pay as the sandbox buyer, then run:\n` +
      `  npm run sandbox:check -- --invoice ${sent.id}`,
  );
}

async function inspect(id: string): Promise<void> {
  const invoice = await getInvoice(id);
  console.log(`Status: ${invoice.status}`);
  const paid = invoice.payments?.paid_amount;
  console.log(`Paid amount: ${paid ? `${paid.value} ${paid.currency_code}` : "none"}`);
  for (const payment of invoice.payments?.transactions ?? []) {
    const amount = payment.amount ? `${payment.amount.value} ${payment.amount.currency_code}` : "?";
    console.log(
      `Payment ${payment.payment_id ?? "?"} on ${payment.payment_date ?? "?"} by ${payment.method ?? "?"}: ${amount}`,
    );
  }

  const payout = await getActualPayout(invoice);
  if (!payout) {
    console.log("Actual payout: not available yet");
    return;
  }
  console.log(`Fee: ${payout.fee.value} ${payout.fee.currency}`);
  console.log(`Net: ${payout.net.value} ${payout.net.currency}`);
  console.log(`Exchange rate: ${payout.exchangeRate ?? "not reported"}`);
  console.log(`Rupees: ${payout.netInr ?? "not reported"}`);
  console.log(`Source: ${payout.source}`);
}

async function main(): Promise<void> {
  const { values } = parseArgs({ options: { invoice: { type: "string" } } });
  await (values.invoice ? inspect(values.invoice) : createAndSend());
}

main().catch(reportFailure);
