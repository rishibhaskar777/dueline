"use client";

import { LoadFailure } from "@/components/shared/LoadFailure";
import { SkeletonBlock } from "@/components/shared/SkeletonBlock";
import { NudgeCard } from "./NudgeCard";
import { useNudges } from "./use-nudges";

export function Nudges() {
  const { state, retry } = useNudges();

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
      <p className="max-w-xl rounded-xl border border-line bg-white p-8 text-lg">
        No late invoices. Nothing to chase today.
      </p>
    );
  }

  return (
    <div className="grid gap-4">
      <p className="max-w-3xl text-sm text-muted-foreground">
        PayPal sends each reminder from your account with the invoice and a Pay now button. PayPal
        allows two reminders a day.
      </p>
      <ul className="grid max-w-3xl gap-4">
        {state.nudges.map((nudge) => (
          <NudgeCard key={nudge.draft.invoiceId} {...nudge} />
        ))}
      </ul>
    </div>
  );
}
