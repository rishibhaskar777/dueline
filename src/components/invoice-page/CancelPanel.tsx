"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cancelInvoice } from "@/lib/api-client";
import { useAction } from "./use-action";

interface CancelPanelProps {
  invoiceId: string;
  invoiceNumber: string;
  onDone: () => void;
  onClose: () => void;
}

export function CancelPanel({ invoiceId, invoiceNumber, onDone, onClose }: CancelPanelProps) {
  // Kept for the life of the panel, so pressing the button again after a failure is a retry.
  const [requestId] = useState(() => crypto.randomUUID());
  const [notifyClient, setNotifyClient] = useState(false);
  const { pending, error, run } = useAction();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void run(() => cancelInvoice(invoiceId, { requestId, notifyClient }), onDone);
  }

  return (
    <form
      onSubmit={onSubmit}
      aria-labelledby="cancel-title"
      className="grid gap-3 rounded-lg border border-line bg-ground p-4"
    >
      <h3 id="cancel-title" className="font-semibold">
        Cancel invoice {invoiceNumber}?
      </h3>
      <p className="text-sm">PayPal will mark it cancelled. This cannot be undone.</p>
      <label className="flex items-start gap-2 text-sm">
        <Checkbox checked={notifyClient} onCheckedChange={setNotifyClient} className="mt-0.5" />
        Email the client about the cancellation
      </label>
      {error && (
        <p role="alert" className="text-sm text-late">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="destructive" disabled={pending}>
          {pending ? "Cancelling…" : "Cancel invoice"}
        </Button>
        <Button type="button" variant="outline" disabled={pending} onClick={onClose}>
          Keep it
        </Button>
      </div>
    </form>
  );
}
