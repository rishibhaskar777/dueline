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
      className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border-[1.5px] border-mark-red bg-tint-red p-[18px]"
    >
      <div className="grid min-w-0 flex-1 basis-72 gap-2">
        <h3 id="cancel-title" className="font-heading text-[17px] font-extrabold text-late">
          Cancel invoice {invoiceNumber}?
        </h3>
        <p className="text-[15px]">PayPal will mark it cancelled. This cannot be undone.</p>
        <label className="flex items-start gap-2 text-sm">
          <Checkbox checked={notifyClient} onCheckedChange={setNotifyClient} className="mt-0.5" />
          Email the client about the cancellation
        </label>
        {error && (
          <p role="alert" className="text-sm text-late">
            {error}
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-2 max-sm:w-full max-sm:[&>*]:flex-1">
        <Button
          type="submit"
          variant="destructive"
          className="h-11 bg-pill-red px-5 font-bold text-pill-red-text"
          disabled={pending}
        >
          {pending ? "Cancelling…" : "Cancel invoice"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11 px-5 font-bold"
          disabled={pending}
          onClick={onClose}
        >
          Keep it
        </Button>
      </div>
    </form>
  );
}
