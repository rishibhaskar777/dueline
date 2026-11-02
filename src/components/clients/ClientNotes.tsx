"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveClientNotes } from "@/lib/api-client";

const MAX_NOTES = 1000;

interface ClientNotesProps {
  clientKey: string;
  initial: string;
}

export function ClientNotes({ clientKey, initial }: ClientNotesProps) {
  const [notes, setNotes] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    try {
      const stored = await saveClientNotes(clientKey, notes);
      setSaved(stored);
      setNotes(stored);
      setMessage({ ok: true, text: "Notes saved." });
    } catch (error) {
      setMessage({
        ok: false,
        text: error instanceof Error ? error.message : "Could not save the notes.",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      aria-labelledby="notes-title"
      className="surface p-6 [--surface-radius:24px]"
    >
      <h2 id="notes-title">Private notes</h2>
      <div className="mt-3 grid gap-1.5">
        <Label htmlFor="client-notes" className="sr-only">
          Private notes about this client
        </Label>
        <Textarea
          id="client-notes"
          rows={3}
          placeholder="Only you see these notes"
          maxLength={MAX_NOTES}
          value={notes}
          onChange={(event) => {
            setNotes(event.target.value);
            setMessage(null);
          }}
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="text-[13px] text-subtle tabular-nums">
          {notes.length.toLocaleString("en-IN")} of {MAX_NOTES.toLocaleString("en-IN")} characters
        </p>
        <Button
          type="submit"
          className="h-11 px-[22px] font-bold"
          disabled={pending || notes.trim() === saved}
        >
          {pending ? "Saving…" : "Save notes"}
        </Button>
        {message && (
          <p
            role={message.ok ? "status" : "alert"}
            className={message.ok ? "w-full text-sm" : "w-full text-sm text-late"}
          >
            {message.text}
          </p>
        )}
      </div>
    </form>
  );
}
