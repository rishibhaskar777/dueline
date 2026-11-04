"use client";

import { useState, type FormEvent } from "react";
import { useAction } from "@/components/invoice-page/use-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { removePromise, savePromise } from "@/lib/api-client";
import { PROMISE_NOTE_MAX, promiseRange } from "@/lib/promises/promise-range";
import type { PaymentPromise } from "@/types";
import { promiseDateError, promiseStatus } from "./promise-model";

interface PromiseControlProps {
  invoiceId: string;
  // The date the app is using, which sets the range the form accepts.
  today: string;
  promise: PaymentPromise | undefined;
  // The saved promise, or null once it was removed.
  onChange: (promise: PaymentPromise | null) => void;
}

// The freelancer notes the date the client said they would pay by. It only reminds them: nothing is
// sent to the client or changed in PayPal.
export function PromiseControl({ invoiceId, today, promise, onChange }: PromiseControlProps) {
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(promise?.promisedOn ?? "");
  const [note, setNote] = useState(promise?.note ?? "");
  const [shownError, setShownError] = useState<string | null>(null);
  const { pending, error, run } = useAction();
  const range = promiseRange(today);

  function open(): void {
    setDate(promise?.promisedOn ?? "");
    setNote(promise?.note ?? "");
    setShownError(null);
    setEditing(true);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const problem = promiseDateError(date, today);
    setShownError(problem);
    if (problem) return;
    let saved: PaymentPromise | undefined;
    void run(
      async () => {
        saved = await savePromise(invoiceId, { promisedOn: date, note: note.trim() });
      },
      () => {
        setEditing(false);
        if (saved) onChange(saved);
      },
    );
  }

  if (editing) {
    return (
      <form
        onSubmit={onSubmit}
        noValidate
        aria-label="Client promised a date"
        className="grid gap-3 rounded-[20px] bg-inner p-4"
      >
        <div className="grid gap-1.5">
          <Label htmlFor={`${invoiceId}-promised-on`} className="font-bold">
            Date the client promised
          </Label>
          <Input
            id={`${invoiceId}-promised-on`}
            type="date"
            min={range.min}
            max={range.max}
            value={date}
            onChange={(event) => setDate(event.target.value)}
            aria-invalid={shownError !== null}
            aria-describedby={shownError ? `${invoiceId}-promise-error` : undefined}
            className="h-11 max-w-[220px] rounded-[14px] px-3.5"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${invoiceId}-promise-note`} className="font-bold">
            Note (optional)
          </Label>
          <Input
            id={`${invoiceId}-promise-note`}
            value={note}
            maxLength={PROMISE_NOTE_MAX}
            placeholder="Said finance pays on the 10th"
            onChange={(event) => setNote(event.target.value)}
            className="h-11 rounded-[14px] px-3.5"
          />
        </div>
        {(shownError ?? error) && (
          <p
            id={`${invoiceId}-promise-error`}
            role="alert"
            className="text-sm font-semibold text-late"
          >
            {shownError ?? error}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={pending} className="h-10 px-5 font-bold">
            {pending ? "Saving…" : "Save"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => setEditing(false)}
            className="h-10 px-5 font-bold"
          >
            Cancel
          </Button>
        </div>
      </form>
    );
  }

  if (!promise) {
    return (
      <Button
        type="button"
        variant="outline"
        onClick={open}
        className="h-10 justify-self-start px-4 font-bold"
      >
        Client promised a date
      </Button>
    );
  }

  return (
    <div className="grid gap-2 rounded-[20px] bg-inner p-4">
      <p className="font-semibold">{promiseStatus(promise, today)}</p>
      {promise.note && <p className="text-sm text-muted-foreground">{promise.note}</p>}
      {error && (
        <p role="alert" className="text-sm font-semibold text-late">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={open} className="h-9 px-4 font-bold">
          Edit
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() =>
            void run(
              () => removePromise(invoiceId),
              () => onChange(null),
            )
          }
          className="h-9 px-4 font-bold"
        >
          Remove
        </Button>
      </div>
    </div>
  );
}
