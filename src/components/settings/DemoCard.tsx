"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getDemoRecipient, resetDemo } from "@/lib/api-client";
import { describeReset } from "./reset-summary";

type Step = "idle" | "confirming" | "working";

export function DemoCard() {
  const [inDemo, setInDemo] = useState(false);
  const [step, setStep] = useState<Step>("idle");
  const [outcome, setOutcome] = useState<{ text: string; failed: boolean } | null>(null);

  useEffect(() => {
    let current = true;
    getDemoRecipient().then(
      () => current && setInDemo(true),
      () => undefined,
    );
    return () => {
      current = false;
    };
  }, []);

  if (!inDemo) return null;

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
      className="mt-6 max-w-xl rounded-xl border border-line bg-white p-6"
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
            This cancels invoices created during the demo and restores the sample clients. Paid
            invoices stay.
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
