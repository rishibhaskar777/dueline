"use client";

import { useRef, useState } from "react";
import { draftReminder, sendReminder } from "@/lib/api-client";
import type { ReminderDraft, Tone } from "@/types";
import { hasEdits, wasSentToday } from "./nudge-model";

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong. Try again in a moment.";
}

interface NudgeDraft {
  draft: ReminderDraft;
  subject: string;
  message: string;
  history: ReminderDraft["history"];
  drafting: boolean;
  sending: boolean;
  draftError: string | null;
  sendError: string | null;
  sentAt: string | null;
  // The tone the user asked for while they have edits that the new draft would replace.
  pendingTone: Tone | null;
  // Dueline sends one reminder per invoice a day, so a card that already sent one is closed.
  closed: boolean;
  setSubject: (subject: string) => void;
  setMessage: (message: string) => void;
  switchTone: (tone: Tone) => void;
  replaceEdits: () => void;
  keepEditing: () => void;
  send: () => void;
}

export function useNudgeDraft(initial: ReminderDraft): NudgeDraft {
  const [draft, setDraft] = useState(initial);
  const [subject, setSubject] = useState(initial.subject);
  const [message, setMessage] = useState(initial.message);
  const [history, setHistory] = useState(initial.history);
  // One ID per draft, reused for every retry of it, so PayPal never gets two reminders from one.
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [drafting, setDrafting] = useState(false);
  const [sending, setSending] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sentAt, setSentAt] = useState<string | null>(null);
  const [pendingTone, setPendingTone] = useState<Tone | null>(null);
  const latestDraft = useRef(0);

  async function redraft(tone: Tone): Promise<void> {
    const turn = ++latestDraft.current;
    setDrafting(true);
    setDraftError(null);
    try {
      const next = await draftReminder(draft.invoiceId, tone);
      if (turn !== latestDraft.current) return;
      setDraft(next);
      setSubject(next.subject);
      setMessage(next.message);
      setRequestId(crypto.randomUUID());
      setSendError(null);
    } catch (error) {
      if (turn === latestDraft.current) setDraftError(messageOf(error));
    } finally {
      if (turn === latestDraft.current) setDrafting(false);
    }
  }

  function switchTone(tone: Tone): void {
    if (tone === draft.tone || drafting || sending) return;
    if (hasEdits(draft, { subject, message })) setPendingTone(tone);
    else void redraft(tone);
  }

  function replaceEdits(): void {
    if (pendingTone === null) return;
    const tone = pendingTone;
    setPendingTone(null);
    void redraft(tone);
  }

  async function send(): Promise<void> {
    if (sending || drafting) return;
    setPendingTone(null);
    setSending(true);
    setSendError(null);
    try {
      const sent = await sendReminder({
        invoiceId: draft.invoiceId,
        subject,
        message,
        tone: draft.tone,
        requestId,
      });
      setSentAt(sent.sentAt);
      setHistory((previous) => [...previous, { tone: draft.tone, sentAt: sent.sentAt }]);
    } catch (error) {
      setSendError(messageOf(error));
    } finally {
      setSending(false);
    }
  }

  return {
    draft,
    subject,
    message,
    history,
    drafting,
    sending,
    draftError,
    sendError,
    sentAt,
    pendingTone,
    closed: sentAt !== null || wasSentToday(history),
    setSubject,
    setMessage,
    switchTone,
    replaceEdits,
    keepEditing: () => setPendingTone(null),
    send: () => void send(),
  };
}
