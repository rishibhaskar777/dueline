import { clientKey, isSameClient } from "@/lib/risk/client-key";
import { scoreClient } from "@/lib/risk/score";
import type { InvoiceSummary } from "@/types";

export interface ClientGroup {
  key: string;
  name: string;
  // Newest first.
  invoices: InvoiceSummary[];
  score: ReturnType<typeof scoreClient>;
}

// Invoices are grouped by the radar's rule, so a client's page and its risk reading agree.
export function groupClients(
  summaries: InvoiceSummary[],
  emailIdentifies: boolean,
  today: string,
): ClientGroup[] {
  const groups: InvoiceSummary[][] = [];
  for (const summary of summaries) {
    const group = groups.find(([first]) =>
      isSameClient(first.client, summary.client, emailIdentifies),
    );
    if (group) group.push(summary);
    else groups.push([summary]);
  }

  return groups.map((invoices) => {
    const newestFirst = [...invoices].sort((a, b) => b.issuedOn.localeCompare(a.issuedOn));
    return {
      key: clientKey(newestFirst[0].client.name),
      name: newestFirst[0].client.name,
      invoices: newestFirst,
      score: scoreClient(newestFirst, today),
    };
  });
}
