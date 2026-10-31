import "server-only";
import { today } from "@/lib/clock";
import { loadSummaries } from "@/lib/payouts/load-summaries";
import { emailIdentifiesClient } from "@/lib/risk/client-risk";
import { getStore } from "@/lib/store";
import type { ClientDetail, ClientSummary } from "@/types";
import { ClientNotFoundError } from "./errors";
import { groupClients, type ClientGroup } from "./group-clients";
import { riskOf, summariseClient } from "./summarise-client";

export async function loadClientGroups(): Promise<ClientGroup[]> {
  return groupClients(await loadSummaries(), emailIdentifiesClient(), today());
}

export async function listClients(): Promise<ClientSummary[]> {
  return (await loadClientGroups())
    .map(summariseClient)
    .sort((a, b) => b.outstandingInr - a.outstandingInr || a.name.localeCompare(b.name));
}

async function findGroup(key: string): Promise<ClientGroup> {
  const group = (await loadClientGroups()).find((candidate) => candidate.key === key);
  if (!group) throw new ClientNotFoundError();
  return group;
}

export async function getClientDetail(key: string): Promise<ClientDetail> {
  const group = await findGroup(key);
  return {
    client: summariseClient(group),
    invoices: group.invoices,
    risk: riskOf(group),
    notes: await getStore().getClientNotes(key),
  };
}

export async function saveClientNotes(key: string, notes: string): Promise<string> {
  await findGroup(key);
  const trimmed = notes.trim();
  await getStore().saveClientNotes(key, trimmed);
  return trimmed;
}
