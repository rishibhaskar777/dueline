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

const EXPLANATION =
  "Count this client's invoices as another client's, for risk, totals and reminders. PayPal invoices are not changed.";

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

  const idle = !hasMerged && !picking;
  return (
    <section aria-labelledby="merge-title" className="surface p-6 [--surface-radius:24px]">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 flex-1 basis-80">
          <h2 id="merge-title">Same client under another name?</h2>
          <p className="mt-1.5 text-[15px] text-muted-foreground">
            {hasMerged
              ? `${endSentence(`Other clients are merged into ${client.name}`)} Unmerge them first to merge this client into another.`
              : EXPLANATION}
          </p>
        </div>
        {idle && (
          <Button
            type="button"
            variant="outline"
            className="h-11 px-[22px] font-bold max-sm:w-full"
            onClick={() => setPicking(true)}
          >
            Merge into another client
          </Button>
        )}
      </div>
      {!hasMerged && picking && target && (
        <div
          className="mt-4 grid gap-3 rounded-[20px] bg-inner p-4"
          role="group"
          aria-label="Confirm the merge"
        >
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
      )}
      {!hasMerged && picking && !target && (
        <div className="mt-4 grid gap-3 rounded-[20px] bg-inner p-4">
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
