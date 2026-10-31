"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { resetDemo } from "@/lib/api-client";
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
      <p className="max-w-xl text-sm text-muted-foreground">
        Demo tools are available only while the app runs in demo mode.
      </p>
    );
  }

  async function reset(): Promise<void> {
    setStep("working");
    setOutcome(null);
    try {
      const result = await resetDemo();
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
      className="max-w-xl rounded-xl border border-line bg-white p-6"
    >
      <h2 id="demo-title" className="text-xl font-semibold">
        Demo
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Restore the sample clients and their payment history in the PayPal sandbox.
      </p>

      {step === "idle" ? (
        <Button variant="outline" className="mt-4" onClick={() => setStep("confirming")}>
          Reset the demo
        </Button>
      ) : (
        <div role="group" aria-label="Confirm the reset" className="mt-4">
          <p className="text-sm">
            This cancels invoices created during the demo, except any made in the last 30 minutes,
            and restores the sample clients. Paid invoices stay.
          </p>
          <div className="mt-3 flex gap-2">
            <Button onClick={reset} disabled={step === "working"}>
              {step === "working" ? "Resetting…" : "Yes, reset the demo"}
            </Button>
            <Button variant="outline" onClick={() => setStep("idle")} disabled={step === "working"}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {outcome && (
        <p
          role={outcome.failed ? "alert" : "status"}
          className={`mt-4 text-sm ${outcome.failed ? "text-late" : "text-paid"}`}
        >
          {outcome.text}
        </p>
      )}
    </section>
  );
}
