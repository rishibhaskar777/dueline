"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { recordPayment } from "@/lib/api-client";
import type { PaymentMethod } from "@/types";
import { useAction } from "./use-action";

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "WIRE_TRANSFER", label: "Wire transfer" },
  { value: "OTHER", label: "Other" },
];

interface RecordPaymentPanelProps {
  invoiceId: string;
  invoiceNumber: string;
  issuedOn: string;
  today: string;
  onDone: () => void;
  onClose: () => void;
}

export function RecordPaymentPanel(props: RecordPaymentPanelProps) {
  const { invoiceId, invoiceNumber, issuedOn, today, onDone, onClose } = props;
  const [requestId] = useState(() => crypto.randomUUID());
  const [method, setMethod] = useState<PaymentMethod>("BANK_TRANSFER");
  const [paidOn, setPaidOn] = useState(today);
  const [note, setNote] = useState("");
  const { pending, error, run } = useAction();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = note.trim();
    void run(
      () =>
        recordPayment(invoiceId, {
          requestId,
          method,
          paidOn,
          ...(trimmed ? { note: trimmed } : {}),
        }),
      onDone,
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      aria-labelledby="record-title"
      className="grid gap-3 rounded-lg border border-line bg-ground p-4"
    >
      <h3 id="record-title" className="font-semibold">
        Record a payment outside PayPal
      </h3>
      <p className="text-sm">
        Use this when {invoiceNumber} was paid another way. PayPal marks it as paid, and Dueline
        counts it as paid outside PayPal. Nothing is sent to your client.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="payment-method">How was it paid?</Label>
          <select
            id="payment-method"
            value={method}
            onChange={(event) => setMethod(event.target.value as PaymentMethod)}
            className="h-8 rounded-lg border border-input bg-card px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {METHODS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="payment-date">Date received</Label>
          <Input
            id="payment-date"
            type="date"
            min={issuedOn}
            max={today}
            required
            value={paidOn}
            onChange={(event) => setPaidOn(event.target.value)}
          />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="payment-note">Note (optional)</Label>
        <Input
          id="payment-note"
          maxLength={200}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-late">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending || !paidOn}>
          {pending ? "Recording…" : "Record payment"}
        </Button>
        <Button type="button" variant="outline" disabled={pending} onClick={onClose}>
          Close
        </Button>
      </div>
    </form>
  );
}
