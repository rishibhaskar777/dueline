"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { useLoad } from "@/components/shared/use-load";
import { deleteRepeat, getRepeats, setRepeatPaused } from "@/lib/api-client";
import { formatDate } from "@/lib/format-date";
import type { RepeatSchedule } from "@/types";

function summary(repeat: RepeatSchedule): string {
  const items = repeat.items.map(({ name }) => name).join(", ");
  const when = repeat.paused ? "Paused" : `Next draft on ${formatDate(repeat.nextOn)}`;
  return `${items}. Day ${repeat.dayOfMonth} of each month. ${when}.`;
}

// Monthly repeats for this client. A repeat only prepares a draft in the queue; the freelancer
// still sends the invoice.
export function ClientRepeats({ clientKey }: { clientKey: string }) {
  const load = useCallback(() => getRepeats(clientKey), [clientKey]);
  const { state, reload } = useLoad(load);
  const [error, setError] = useState<string | null>(null);

  if (state.kind !== "ready") return null;

  async function act(change: () => Promise<unknown>): Promise<void> {
    setError(null);
    try {
      await change();
      reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not change the repeat.");
    }
  }

  return (
    <section aria-labelledby="repeats-title" className="rounded-xl border border-line bg-card p-6">
      <h2 id="repeats-title" className="text-xl font-semibold">
        Repeats
      </h2>
      {state.data.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          No monthly repeats. Open one of this client&apos;s invoices and choose Repeat monthly.
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {state.data.map((repeat) => (
            <li key={repeat.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <p className="min-w-0 text-sm">{summary(repeat)}</p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void act(() => setRepeatPaused(repeat.id, !repeat.paused))}
                >
                  {repeat.paused ? "Resume" : "Pause"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void act(() => deleteRepeat(repeat.id))}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-late">
          {error}
        </p>
      )}
    </section>
  );
}
