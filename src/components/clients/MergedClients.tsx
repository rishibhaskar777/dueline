"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { unmergeClient } from "@/lib/api-client";
import type { MergedClient } from "@/types";

interface MergedClientsProps {
  clientKey: string;
  clientName: string;
  merged: MergedClient[];
  onChanged: () => void;
}

export function MergedClients({ clientKey, clientName, merged, onChanged }: MergedClientsProps) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function unmerge(from: string): Promise<void> {
    setBusy(from);
    setError(null);
    try {
      await unmergeClient(clientKey, from);
      onChanged();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not undo the merge.");
    } finally {
      setBusy(null);
    }
  }

  if (merged.length === 0) return null;
  return (
    <section aria-labelledby="merged-title" className="rounded-xl border border-line bg-card p-6">
      <h2 id="merged-title" className="text-xl font-semibold">
        Merged into {clientName}
      </h2>
      <ul className="mt-3 divide-y divide-line text-sm">
        {merged.map(({ key, name, email }) => (
          <li key={key} className="flex flex-wrap items-center justify-between gap-3 py-2">
            <span>
              {name} <span className="text-muted-foreground">({email})</span>
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label={`Unmerge ${name}`}
              disabled={busy === key}
              onClick={() => void unmerge(key)}
            >
              {busy === key ? "Unmerging…" : "Unmerge"}
            </Button>
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="mt-3 text-sm text-late">
          {error}
        </p>
      )}
    </section>
  );
}
