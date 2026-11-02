import type { ClientSummary } from "@/types";

// Name, email and the reason line are searched, so "late" or an address finds the client.
export function searchClients(clients: ClientSummary[], search: string): ClientSummary[] {
  const words = search.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return clients;
  return clients.filter((client) => {
    const haystack = `${client.name} ${client.email} ${client.riskReason}`.toLowerCase();
    return words.every((word) => haystack.includes(word));
  });
}

// Most owed first, then by name.
export function sortClients(clients: ClientSummary[]): ClientSummary[] {
  return [...clients].sort(
    (a, b) => b.outstandingInr - a.outstandingInr || a.name.localeCompare(b.name),
  );
}
