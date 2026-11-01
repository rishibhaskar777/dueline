import "server-only";
import { resolveClientName } from "@/lib/clients/aliases";
import { today } from "@/lib/clock";
import { getEnv } from "@/lib/env";
import { loadVisibleInvoices } from "@/lib/demo/visible-invoices";
import type { ClientRisk, InvoiceSummary, RiskLevel } from "@/types";
import type { Lateness } from "@/lib/reminders/tone";
import { getStore } from "@/lib/store";
import { isSameClient } from "./client-key";
import { scoreClient } from "./score";

// The demo's clients share one sandbox email, so only outside the demo does an email say who pays.
export const emailIdentifiesClient = (): boolean => !getEnv().DEMO_MODE;

export async function getClientRisk(email: string, name?: string): Promise<ClientRisk> {
  const identifies = emailIdentifiesClient();
  const summaries = (await loadVisibleInvoices()).map(({ summary }) => summary);
  const resolved = resolveClientName(name, await getStore().listClientAliases(), summaries);
  const invoices = summaries.filter(({ client }) =>
    isSameClient(client, { email, name: resolved }, identifies),
  );
  const first = invoices[0]?.client;

  return {
    clientEmail: first?.email ?? email,
    clientName: first?.name ?? name?.trim() ?? email,
    ...scoreClient(invoices, today()),
  };
}

// Only clients with something to judge are listed, so a missing id means "no history".
export function riskScoresById(summaries: InvoiceSummary[]): Map<string, Lateness> {
  const identifies = emailIdentifiesClient();
  const date = today();
  const scores = new Map<string, Lateness>();
  for (const summary of summaries) {
    const theirs = summaries.filter(({ client }) =>
      isSameClient(client, summary.client, identifies),
    );
    const { invoicesConsidered, level, lateCount } = scoreClient(theirs, date);
    if (invoicesConsidered > 0) scores.set(summary.id, { level, lateCount, invoicesConsidered });
  }
  return scores;
}

export function riskLevelsById(summaries: InvoiceSummary[]): Map<string, RiskLevel> {
  return new Map([...riskScoresById(summaries)].map(([id, { level }]) => [id, level]));
}
