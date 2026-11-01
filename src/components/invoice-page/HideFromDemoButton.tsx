"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { setInvoiceHidden } from "@/lib/api-client";

interface HideFromDemoButtonProps {
  invoiceId: string;
  hidden: boolean;
  onChanged: () => void;
}

// Demo mode only: takes an invoice off every screen and export, or puts it back.
export function HideFromDemoButton({ invoiceId, hidden, onChanged }: HideFromDemoButtonProps) {
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  async function toggle(): Promise<void> {
    setBusy(true);
    setFailure(null);
    try {
      await setInvoiceHidden(invoiceId, !hidden);
      onChanged();
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "Could not change that.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button type="button" variant="outline" disabled={busy} onClick={() => void toggle()}>
        {hidden ? "Show in the demo" : "Hide from the demo"}
      </Button>
      {failure && (
        <p role="alert" className="w-full text-sm text-late">
          {failure}
        </p>
      )}
    </>
  );
}
