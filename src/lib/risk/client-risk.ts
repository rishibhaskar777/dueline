import "server-only";
import { today } from "@/lib/clock";
import { getEnv } from "@/lib/env";
import { loadInvoices } from "@/lib/paypal/summaries";
import type { ClientRisk, InvoiceSummary, RiskLevel } from "@/types";
import { isSameClient } from "./client-key";
import { scoreClient } from "./score";

// The demo's clients share one sandbox email, so only outside the demo does an email say who pays.
export const emailIdentifiesClient = (): boolean => !getEnv().DEMO_MODE;

export async function getClientRisk(email: string, name?: string): Promise<ClientRisk> {
  const identifies = emailIdentifiesClient();
  const invoices = (await loadInvoices())
    .map(({ summary }) => summary)
    .filter(({ client }) => isSameClient(client, { email, name }, identifies));
  const first = invoices[0]?.client;

  return {
    clientEmail: first?.email ?? email,
    clientName: first?.name ?? name?.trim() ?? email,
    ...scoreClient(invoices, today()),
  };
}

// Only clients with something to judge are listed, so a missing id means "no history".
export function riskLevelsById(summaries: InvoiceSummary[]): Map<string, RiskLevel> {
  const identifies = emailIdentifiesClient();
  const date = today();
  const levels = new Map<string, RiskLevel>();
  for (const summary of summaries) {
    const theirs = summaries.filter(({ client }) =>
      isSameClient(client, summary.client, identifies),
    );
    const score = scoreClient(theirs, date);
    if (score.invoicesConsidered > 0) levels.set(summary.id, score.level);
  }
  return levels;
}
