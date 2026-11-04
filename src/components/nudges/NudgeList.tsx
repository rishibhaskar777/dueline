"use client";

import { useCallback, useState } from "react";
import { LoadFailure } from "@/components/shared/LoadFailure";
import { SkeletonBlock } from "@/components/shared/SkeletonBlock";
import { draftReminder } from "@/lib/api-client";
import { createDraftQueue } from "./draft-queue";
import { NudgeCard } from "./NudgeCard";
import { LIMIT_REACHED_NOTICE } from "./nudge-model";
import type { NudgesData } from "./use-nudges";

type NudgeListProps = Pick<NudgesData, "state" | "retry">;

// The model is asked for at most this many drafts at once, however many cards are waiting.
const DRAFTS_IN_FLIGHT = 2;

export function NudgeList({ state, retry }: NudgeListProps) {
  const [sentHere, setSentHere] = useState(0);
  const [queue] = useState(() => createDraftQueue(DRAFTS_IN_FLIGHT));
  const improve = useCallback(
    (...args: Parameters<typeof draftReminder>) => queue.run(() => draftReminder(...args)),
    [queue],
  );

  if (state.kind === "error") {
    return <LoadFailure title="Couldn't load your nudges" error={state.error} onRetry={retry} />;
  }
  if (state.kind === "loading") {
    return (
      <div role="status" aria-label="Loading your nudges" className="grid gap-4">
        <SkeletonBlock className="h-80 rounded-[28px]" />
        <SkeletonBlock className="h-80 rounded-[28px]" />
      </div>
    );
  }

  const { nudges, headsUps } = state;
  const limitReached = state.remindersLeftToday - sentHere <= 0;
  const cardProps = {
    limitReached,
    improve,
    onSent: () => setSentHere((count) => count + 1),
  };

  return (
    <div className="grid gap-8">
      {limitReached && (headsUps.length > 0 || nudges.length > 0) && (
        <p
          role="status"
          className="max-w-3xl rounded-[20px] bg-tint-amber p-4 text-sm font-semibold text-due-soon"
        >
          {LIMIT_REACHED_NOTICE}
        </p>
      )}
      {headsUps.length > 0 && (
        <section aria-labelledby="due-soon-title" className="grid gap-4">
          <div className="grid gap-1.5">
            <h2 id="due-soon-title" className="flex items-center gap-2.5 text-[22px]">
              Due soon
              <span className="rounded-full bg-tint-amber px-2.5 py-0.5 text-sm font-bold text-due-soon tabular-nums">
                {headsUps.length}
              </span>
            </h2>
            <p className="max-w-3xl text-[15px] text-muted-foreground">
              A friendly note before the due date, written in a tone lower than Gentle. Send your
              own message from your email or PayPal&apos;s reminder, one heads-up for each invoice.
              Nothing is sent until you press a button.
            </p>
          </div>
          <ul className="grid gap-4">
            {headsUps.map((nudge) => (
              <NudgeCard key={nudge.draft.invoiceId} {...nudge} {...cardProps} />
            ))}
          </ul>
        </section>
      )}

      {nudges.length === 0 ? (
        <p className="max-w-xl surface p-8 text-lg">No late invoices. Nothing to chase today.</p>
      ) : (
        <section
          aria-labelledby={headsUps.length > 0 ? "late-title" : undefined}
          className="grid gap-4"
        >
          {headsUps.length > 0 && (
            <h2 id="late-title" className="flex items-center gap-2.5 text-[22px]">
              Late
              <span className="rounded-full bg-tint-red px-2.5 py-0.5 text-sm font-bold text-late tabular-nums">
                {nudges.length}
              </span>
            </h2>
          )}
          <p className="max-w-3xl text-[15px] text-muted-foreground">
            PayPal can email its standard reminder from your account, with a Pay now button, and
            PayPal writes the wording. Or send your own message from your email. PayPal allows two
            reminders a day. Nothing is sent until you press a button.
          </p>
          <ul className="grid gap-4">
            {nudges.map((nudge) => (
              <NudgeCard key={nudge.draft.invoiceId} {...nudge} {...cardProps} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
