"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createRepeat } from "@/lib/api-client";
import { formatDate } from "@/lib/format-date";
import { useAction } from "./use-action";

interface RepeatPanelProps {
  invoiceId: string;
  invoiceNumber: string;
  onClose: () => void;
}

export function RepeatPanel({ invoiceId, invoiceNumber, onClose }: RepeatPanelProps) {
  // Kept for the life of the panel, so pressing the button again after a failure saves it once.
  const [requestId] = useState(() => crypto.randomUUID());
  const [day, setDay] = useState("1");
  const [nextOn, setNextOn] = useState<string | null>(null);
  const { pending, error, run } = useAction();
  const dayNumber = Number(day);
  const valid = Number.isInteger(dayNumber) && dayNumber >= 1 && dayNumber <= 28;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!valid) return;
    void run(
      async () => {
        const saved = await createRepeat({ invoiceId, dayOfMonth: dayNumber, requestId });
        setNextOn(saved.nextOn);
      },
      () => {},
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      aria-labelledby="repeat-title"
      className="grid gap-3 rounded-lg border border-line bg-ground p-4"
    >
      <h3 id="repeat-title" className="font-semibold">
        Repeat {invoiceNumber} every month
      </h3>
      <p className="text-sm">
        On that day Dueline prepares a draft with the same client and items. It appears under
        Nudges, and nothing is sent until you review it and click send.
      </p>
      <div className="grid gap-1.5">
        <Label htmlFor="repeat-day">Day of the month (1 to 28)</Label>
        <Input
          id="repeat-day"
          inputMode="numeric"
          autoComplete="off"
          value={day}
          onChange={(event) => setDay(event.target.value)}
          aria-invalid={!valid}
          className="w-24 tabular-nums"
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-late">
          {error}
        </p>
      )}
      {nextOn && (
        <p role="status" className="text-sm font-medium text-paid">
          Saved. The next draft is prepared on {formatDate(nextOn)}.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending || !valid || nextOn !== null}>
          {pending ? "Saving…" : "Save the repeat"}
        </Button>
        <Button type="button" variant="outline" disabled={pending} onClick={onClose}>
          {nextOn ? "Close" : "Cancel"}
        </Button>
      </div>
    </form>
  );
}
