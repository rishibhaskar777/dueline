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
      className="rounded-xl border border-line bg-card p-6"
    >
      <h2 id="notes-title" className="text-xl font-semibold">
        Notes
      </h2>
      <div className="mt-3 grid gap-1.5">
        <Label htmlFor="client-notes">Private notes about this client</Label>
        <Textarea
          id="client-notes"
          rows={5}
          maxLength={MAX_NOTES}
          value={notes}
          onChange={(event) => {
            setNotes(event.target.value);
            setMessage(null);
          }}
        />
        <p className="text-xs text-muted-foreground tabular-nums">
          {notes.length.toLocaleString("en-IN")} of {MAX_NOTES.toLocaleString("en-IN")} characters.
          Only you see these notes.
        </p>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending || notes.trim() === saved}>
          {pending ? "Saving…" : "Save notes"}
        </Button>
        {message && (
          <p
            role={message.ok ? "status" : "alert"}
            className={message.ok ? "text-sm" : "text-sm text-late"}
          >
            {message.text}
          </p>
        )}
      </div>
    </form>
  );
}
