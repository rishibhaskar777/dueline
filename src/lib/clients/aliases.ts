import { clientKey } from "@/lib/risk/client-key";
import type { ClientAlias } from "@/lib/store/store";
import type { InvoiceSummary } from "@/types";

export type MergeRefusal = "same_client" | "target_is_merged" | "source_has_merges";

export const MERGE_REFUSAL_TEXT: Record<MergeRefusal, string> = {
  same_client: "A client cannot be merged into itself.",
  target_is_merged: "That client was already merged into another one. Unmerge it first.",
  source_has_merges: "Other clients are merged into this one. Unmerge them first, then merge.",
};

// A merge points one client at another that stands on its own, so there are no chains: neither a
// client that is merged away nor one that others are merged into can be merged again.
export function checkMerge(
  aliases: readonly ClientAlias[],
  fromKey: string,
  intoKey: string,
): MergeRefusal | null {
  if (fromKey === intoKey) return "same_client";
  if (aliases.some((alias) => alias.fromKey === intoKey)) return "target_is_merged";
  if (aliases.some((alias) => alias.intoKey === fromKey)) return "source_has_merges";
  return null;
}

function newestNameByKey(summaries: readonly InvoiceSummary[]): Map<string, string> {
  const names = new Map<string, string>();
  const newestFirst = [...summaries].sort((a, b) => b.issuedOn.localeCompare(a.issuedOn));
  for (const { client } of newestFirst) {
    const key = clientKey(client.name);
    if (!names.has(key)) names.set(key, client.name);
  }
  return names;
}

// Invoices of a merged client take the other client's name, so every grouping rule (the radar,
// totals, the forecast, reminders, search) sees one client. The email stays the invoice's own, so
// nothing is ever addressed to the wrong person. An alias whose target has no invoices is ignored.
export function applyAliases<T extends { summary: InvoiceSummary }>(
  loaded: T[],
  aliases: readonly ClientAlias[],
): T[] {
  if (aliases.length === 0) return loaded;
  const names = newestNameByKey(loaded.map(({ summary }) => summary));
  const intoByFrom = new Map(aliases.map(({ fromKey, intoKey }) => [fromKey, intoKey]));

  return loaded.map((item) => {
    const into = intoByFrom.get(clientKey(item.summary.client.name));
    const name = into === undefined ? undefined : names.get(into);
    return name === undefined
      ? item
      : {
          ...item,
          summary: {
            ...item.summary,
            mergedFrom: item.summary.client.name,
            client: { ...item.summary.client, name },
          },
        };
  });
}

// A name typed on New invoice for a merged client finds the client it was merged into.
export function resolveClientName(
  name: string | undefined,
  aliases: readonly ClientAlias[],
  summaries: readonly InvoiceSummary[],
): string | undefined {
  if (name === undefined) return undefined;
  const alias = aliases.find(({ fromKey }) => fromKey === clientKey(name));
  return (alias && newestNameByKey(summaries).get(alias.intoKey)) ?? name;
}
