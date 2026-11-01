import type { ClientSummary } from "@/types";

// The grid's own search box looks in the same fields; a list of cards needs the same rule.
export function searchClients(clients: ClientSummary[], search: string): ClientSummary[] {
  const words = search.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return clients;
  return clients.filter((client) => {
    const haystack = `${client.name} ${client.riskReason}`.toLowerCase();
    return words.every((word) => haystack.includes(word));
  });
}
