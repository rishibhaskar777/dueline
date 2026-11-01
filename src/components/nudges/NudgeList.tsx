"use client";

import { useCallback, useState } from "react";
import { LoadFailure } from "@/components/shared/LoadFailure";
import { SkeletonBlock } from "@/components/shared/SkeletonBlock";
import { draftReminder } from "@/lib/api-client";
import { createDraftQueue } from "./draft-queue";
import { NudgeCard } from "./NudgeCard";
import { LIMIT_REACHED_NOTICE } from "./nudge-model";
import { useNudges } from "./use-nudges";

// The model is asked for at most this many drafts at once, however many cards are waiting.
const DRAFTS_IN_FLIGHT = 2;

export function NudgeList() {
  const { state, retry } = useNudges();
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
        <SkeletonBlock className="h-80" />
        <SkeletonBlock className="h-80" />
      </div>
    );
  }
  if (state.nudges.length === 0) {
    return (
      <p className="max-w-xl rounded-xl border border-line bg-card p-8 text-lg">
        No late invoices. Nothing to chase today.
      </p>
    );
  }

  const limitReached = state.remindersLeftToday - sentHere <= 0;

  return (
    <div className="grid gap-4">
      <p className="max-w-3xl text-sm text-muted-foreground">
        PayPal sends each reminder from your account with the invoice and a Pay now button. PayPal
        allows two reminders a day.
      </p>
      {limitReached && (
        <p role="status" className="max-w-3xl rounded-xl border border-line bg-ground p-4 text-sm">
          {LIMIT_REACHED_NOTICE}
        </p>
      )}
      <ul className="grid max-w-3xl gap-4">
        {state.nudges.map((nudge) => (
          <NudgeCard
            key={nudge.draft.invoiceId}
            {...nudge}
            limitReached={limitReached}
            improve={improve}
            onSent={() => setSentHere((count) => count + 1)}
          />
        ))}
      </ul>
    </div>
  );
}
