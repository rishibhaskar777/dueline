"use client";

import Link from "next/link";
import { useState } from "react";
import { Sun } from "lucide-react";
import { IconTile } from "@/components/shared/IconTile";
import { Button } from "@/components/ui/button";
import { runDailyPreparation } from "@/lib/api-client";
import { ResultStrip } from "./ResultStrip";
import { useDemoMode } from "./use-demo-mode";

type Outcome = { text: string; failed: boolean; ran: boolean };

function describeRun(ran: boolean, drafts: number): string {
  const found = `${drafts} ${drafts === 1 ? "draft is" : "drafts are"} ready under Nudges.`;
  return ran
    ? `Prepared today's drafts. ${found}`
    : `Today's preparation had already run. ${found}`;
}

// Runs the same job as the morning cron, so the demo can show the queue without waiting for it.
export function PrepareCard() {
  const inDemo = useDemoMode();
  const [working, setWorking] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  if (!inDemo) return null;

  async function run(): Promise<void> {
    setWorking(true);
    setOutcome(null);
    try {
      const { ran, digest } = await runDailyPreparation();
      setOutcome({ text: describeRun(ran, digest.preparedDrafts), failed: false, ran });
    } catch (error) {
      const text = error instanceof Error ? error.message : "Could not run today's preparation.";
      setOutcome({ text, failed: true, ran: false });
    } finally {
      setWorking(false);
    }
  }

  return (
    <section
      aria-labelledby="prepare-title"
      className="surface flex flex-col items-start gap-3.5 p-[30px] max-md:p-6 [--h2-size:28px] [--h2-tracking:-0.4px]"
    >
      <IconTile tone="amber">
        <Sun aria-hidden="true" className="size-[26px]" />
      </IconTile>
      <h2 id="prepare-title">Morning preparation</h2>
      <p className="text-base leading-relaxed text-muted-foreground">
        Write today&apos;s reminder drafts and monthly repeats now instead of waiting for the daily
        job. It runs once a day; nothing is sent to your clients.
      </p>
      <Button
        variant="outline"
        size="lg"
        className="px-6 font-bold"
        onClick={() => void run()}
        disabled={working}
      >
        {working ? "Preparing…" : "Run today's preparation now"}
      </Button>
      {outcome && (
        <ResultStrip failed={outcome.failed}>
          {outcome.text}{" "}
          {!outcome.failed && (
            <Link href="/nudges" className="underline underline-offset-2">
              Open Nudges
            </Link>
          )}
        </ResultStrip>
      )}
    </section>
  );
}
