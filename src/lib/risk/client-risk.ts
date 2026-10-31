import "server-only";
import { today } from "@/lib/clock";
import { loadInvoices } from "@/lib/paypal/summaries";
import type { ClientRisk, InvoiceSummary, RiskLevel } from "@/types";
import { clientKeyOf, isSameClient } from "./client-key";
import { scoreClient } from "./score";

export async function getClientRisk(email: string, name?: string): Promise<ClientRisk> {
  const invoices = (await loadInvoices())
    .map(({ summary }) => summary)
    .filter(({ client }) => isSameClient(client, email, name));
  const first = invoices[0]?.client;

  return {
    clientEmail: first?.email ?? email,
    clientName: first?.name ?? name?.trim() ?? email,
    ...scoreClient(invoices, today()),
  };
}

// Only clients with something to judge are listed, so a missing key means "no history".
export function riskByClient(summaries: InvoiceSummary[]): Map<string, RiskLevel> {
  const byClient = new Map<string, InvoiceSummary[]>();
  for (const summary of summaries) {
    const key = clientKeyOf(summary.client);
    byClient.set(key, [...(byClient.get(key) ?? []), summary]);
  }

  const date = today();
  const levels = new Map<string, RiskLevel>();
  for (const [key, invoices] of byClient) {
    const score = scoreClient(invoices, date);
    if (score.invoicesConsidered > 0) levels.set(key, score.level);
  }
  return levels;
}
