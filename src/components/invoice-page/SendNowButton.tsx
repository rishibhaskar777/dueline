"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { sendInvoiceDraft } from "@/lib/api-client";

interface SendNowButtonProps {
  invoiceId: string;
  className?: string;
  onSent: () => void;
}

// Sends a draft invoice. The request ID is kept for retries, so a double click sends it once.
export function SendNowButton({ invoiceId, className, onSent }: SendNowButtonProps) {
  const [requestId] = useState(() => crypto.randomUUID());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(): Promise<void> {
    setPending(true);
    setError(null);
    try {
      await sendInvoiceDraft(invoiceId, requestId);
      onSent();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not send the invoice.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button type="button" className={className} disabled={pending} onClick={() => void send()}>
        {pending ? "Sending…" : "Send now"}
      </Button>
      {error && (
        <p role="alert" className="w-full text-sm text-late">
          {error}
        </p>
      )}
    </>
  );
}
