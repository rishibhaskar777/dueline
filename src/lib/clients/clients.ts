import "server-only";
import { today } from "@/lib/clock";
import { loadSummaries } from "@/lib/payouts/load-summaries";
import { emailIdentifiesClient } from "@/lib/risk/client-risk";
import { getStore } from "@/lib/store";
import type { ClientDetail, ClientSummary, ReminderLanguage } from "@/types";
import { checkMerge, MERGE_REFUSAL_TEXT } from "./aliases";
import { ClientMergeError, ClientNotFoundError } from "./errors";
import { groupClients, type ClientGroup } from "./group-clients";
import { riskOf, summariseClient } from "./summarise-client";

export async function loadClientGroups(): Promise<ClientGroup[]> {
  return groupClients(await loadSummaries(), emailIdentifiesClient(), today());
}

export async function listClients(): Promise<ClientSummary[]> {
  return (await loadClientGroups())
    .map((group) => summariseClient(group, today()))
    .sort((a, b) => b.outstandingInr - a.outstandingInr || a.name.localeCompare(b.name));
}

async function findGroup(key: string): Promise<ClientGroup> {
  const group = (await loadClientGroups()).find((candidate) => candidate.key === key);
  if (!group) throw new ClientNotFoundError();
  return group;
}

export async function getClientDetail(key: string): Promise<ClientDetail> {
  const group = await findGroup(key);
  const aliases = await getStore().listClientAliases();
  return {
    client: summariseClient(group, today()),
    invoices: group.invoices,
    risk: riskOf(group),
    notes: await getStore().getClientNotes(key),
    language: await getStore().getClientLanguage(key),
    merged: aliases
      .filter(({ intoKey }) => intoKey === key)
      .map(({ fromKey, fromName, fromEmail }) => ({
        key: fromKey,
        name: fromName,
        email: fromEmail,
      })),
  };
}

export async function saveClientNotes(key: string, notes: string): Promise<string> {
  await findGroup(key);
  const trimmed = notes.trim();
  await getStore().saveClientNotes(key, trimmed);
  return trimmed;
}

export async function saveClientLanguage(
  key: string,
  language: ReminderLanguage,
): Promise<ReminderLanguage> {
  await findGroup(key);
  await getStore().saveClientLanguage(key, language);
  return language;
}

// Counts the invoices of one client as another's in Dueline's own views. Nothing changes in PayPal.
export async function mergeClient(fromKey: string, intoKey: string): Promise<void> {
  const [from, , aliases] = await Promise.all([
    findGroup(fromKey),
    findGroup(intoKey),
    getStore().listClientAliases(),
  ]);
  const refusal = checkMerge(aliases, fromKey, intoKey);
  if (refusal) throw new ClientMergeError(MERGE_REFUSAL_TEXT[refusal]);
  await getStore().saveClientAlias({
    fromKey,
    intoKey,
    fromName: from.name,
    fromEmail: from.invoices[0].client.email,
  });
}

export async function unmergeClient(intoKey: string, fromKey: string): Promise<void> {
  const aliases = await getStore().listClientAliases();
  if (!aliases.some((alias) => alias.fromKey === fromKey && alias.intoKey === intoKey)) {
    throw new ClientNotFoundError();
  }
  await getStore().deleteClientAlias(fromKey);
}
