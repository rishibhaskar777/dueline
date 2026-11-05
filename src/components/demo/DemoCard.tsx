"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { IconTile } from "@/components/shared/IconTile";
import { Button } from "@/components/ui/button";
import { showTourAgain } from "@/components/dashboard/use-layout";
import { resetDemo } from "@/lib/api-client";
import { ResultStrip } from "./ResultStrip";
import { describeReset } from "./reset-summary";
import { useDemoMode } from "./use-demo-mode";

type Step = "idle" | "confirming" | "working";

export function DemoCard() {
  const [step, setStep] = useState<Step>("idle");
  const [outcome, setOutcome] = useState<{ text: string; failed: boolean } | null>(null);

  const inDemo = useDemoMode();

  if (inDemo === null) return null;
  if (!inDemo) {
    return (
      <p className="surface p-6 text-[15px] text-muted-foreground md:col-span-2">
        Demo tools are available only while the app runs in demo mode.
      </p>
    );
  }

  async function reset(): Promise<void> {
    setStep("working");
    setOutcome(null);
    try {
      const result = await resetDemo();
      showTourAgain();
      setOutcome({ text: describeReset(result), failed: result.failed > 0 });
    } catch (error) {
      const text = error instanceof Error ? error.message : "Could not reset the demo.";
      setOutcome({ text, failed: true });
    } finally {
      setStep("idle");
    }
  }

  return (
    <section
      aria-labelledby="demo-title"
      className="surface flex flex-col items-start gap-3.5 p-[30px] max-md:p-6 [--h2-size:28px] [--h2-tracking:-0.4px]"
    >
      <IconTile tone="blue">
        <RotateCcw aria-hidden="true" className="size-[26px]" />
      </IconTile>
      <h2 id="demo-title">Reset the demo</h2>
      <p className="text-base leading-relaxed text-muted-foreground">
        Seeds a fresh copy of the sample clients and their history, dated from today. Invoices made
        in the last 30 minutes and real PayPal payments are kept. Once every 10 minutes.
      </p>

      {step === "idle" ? (
        <Button size="lg" className="px-6 font-bold" onClick={() => setStep("confirming")}>
          Reset the demo
        </Button>
      ) : (
        <div role="group" aria-label="Confirm the reset" className="grid gap-3">
          <p className="text-[15px]">
            This cancels invoices created during the demo, except any made in the last 30 minutes,
            and starts the sample clients again, dated from today. Paid invoices stay, but the older
            sample ones leave the screens.
          </p>
          <div className="flex flex-wrap gap-2.5">
            <Button
              size="lg"
              className="px-6 font-bold"
              onClick={reset}
              disabled={step === "working"}
            >
              {step === "working" ? "Resetting…" : "Yes, reset the demo"}
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="px-6 font-bold"
              onClick={() => setStep("idle")}
              disabled={step === "working"}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {outcome && <ResultStrip failed={outcome.failed}>{outcome.text}</ResultStrip>}
    </section>
  );
}
