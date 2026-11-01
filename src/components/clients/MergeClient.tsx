"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SearchList } from "@/components/shared/SearchList";
import { Button } from "@/components/ui/button";
import { getClients, mergeClient } from "@/lib/api-client";
import { endSentence } from "@/lib/sentence";
import type { ClientSummary } from "@/types";
import { clientHref } from "./client-href";
import { mergeSentence } from "./merge-text";

interface MergeClientProps {
  client: ClientSummary;
  // A client that others are merged into cannot itself be merged away.
  hasMerged: boolean;
}

export function MergeClient({ client, hasMerged }: MergeClientProps) {
  const router = useRouter();
  const [picking, setPicking] = useState(false);
  const [others, setOthers] = useState<ClientSummary[] | null>(null);
  const [target, setTarget] = useState<ClientSummary | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!picking || others) return;
    getClients().then(
      (clients) => setOthers(clients.filter(({ key }) => key !== client.key)),
      () => setError("Could not load your other clients. Try again."),
    );
  }, [picking, others, client.key]);

  function close(): void {
    setPicking(false);
    setTarget(null);
    setError(null);
  }

  async function merge(into: ClientSummary): Promise<void> {
    setPending(true);
    setError(null);
    try {
      await mergeClient(client.key, into.key);
      router.push(clientHref(into.key));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not merge the clients.");
      setPending(false);
    }
  }

  return (
    <section aria-labelledby="merge-title" className="rounded-xl border border-line bg-card p-6">
      <h2 id="merge-title" className="text-xl font-semibold">
        Same client under another name?
      </h2>
      {hasMerged ? (
        <p className="mt-2 text-sm text-muted-foreground">
          {endSentence(`Other clients are merged into ${client.name}`)} Unmerge them first to merge
          this client into another.
        </p>
      ) : !picking ? (
        <>
          <p className="mt-2 text-sm text-muted-foreground">
            Count this client&apos;s invoices as another client&apos;s, for risk, totals and
            reminders.
          </p>
          <Button type="button" variant="outline" className="mt-3" onClick={() => setPicking(true)}>
            Merge into another client
          </Button>
        </>
      ) : target ? (
        <div className="mt-3 grid gap-3" role="group" aria-label="Confirm the merge">
          <p className="text-sm">{mergeSentence(client, target)}</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={pending} onClick={() => void merge(target)}>
              {pending ? "Merging…" : `Merge into ${target.name}`}
            </Button>
            <Button type="button" variant="outline" disabled={pending} onClick={close}>
              Keep them separate
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-3 grid gap-3">
          {others ? (
            <SearchList
              label="Merge into which client?"
              placeholder="Client name or email"
              emptyText="No other clients."
              options={others.map(({ key, name, email }) => ({
                id: key,
                label: name,
                keywords: email,
                hint: email,
              }))}
              onChoose={(key) => setTarget(others.find((other) => other.key === key) ?? null)}
            />
          ) : (
            !error && <p className="text-sm text-muted-foreground">Loading your clients…</p>
          )}
          <Button type="button" variant="outline" className="w-fit" onClick={close}>
            Cancel
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-late">
          {error}
        </p>
      )}
    </section>
  );
}
