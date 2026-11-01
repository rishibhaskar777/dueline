"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { runDailyPreparation } from "@/lib/api-client";
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
      className="max-w-xl rounded-xl border border-line bg-card p-6"
    >
      <h2 id="prepare-title" className="text-xl font-semibold">
        Morning preparation
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Write today&apos;s reminder drafts and monthly repeats now instead of waiting for the daily
        job. It runs once a day; nothing is sent to your clients.
      </p>
      <Button variant="outline" className="mt-4" onClick={() => void run()} disabled={working}>
        {working ? "Preparing…" : "Run today's preparation now"}
      </Button>
      {outcome && (
        <p
          role={outcome.failed ? "alert" : "status"}
          className={`mt-4 text-sm ${outcome.failed ? "text-late" : "text-paid"}`}
        >
          {outcome.text}{" "}
          {!outcome.failed && (
            <Link href="/nudges" className="underline underline-offset-2">
              Open Nudges
            </Link>
          )}
        </p>
      )}
    </section>
  );
}
