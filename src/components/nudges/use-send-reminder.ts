"use client";

import { useRef, useState, type RefObject } from "react";
import { sendReminder } from "@/lib/api-client";
import type { ReminderDraft } from "@/types";

export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong. Try again in a moment.";
}

interface ReminderToSend {
  draft: ReminderDraft;
  subject: string;
  message: string;
  // One ID per draft, reused for every retry of it, so PayPal never gets two reminders from one.
  requestId: string;
}

interface SendState {
  history: ReminderDraft["history"];
  sending: boolean;
  sendError: string | null;
  sentAt: string | null;
  // True from the moment a send starts until it fails, so a late answer cannot change the text.
  started: RefObject<boolean>;
  clearError: () => void;
  send: (reminder: ReminderToSend) => Promise<void>;
}

export function useSendReminder(
  initialHistory: ReminderDraft["history"],
  onSent: () => void,
): SendState {
  const [history, setHistory] = useState(initialHistory);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sentAt, setSentAt] = useState<string | null>(null);
  const started = useRef(false);

  async function send({ draft, subject, message, requestId }: ReminderToSend): Promise<void> {
    if (sending) return;
    setSending(true);
    started.current = true;
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
      onSent();
      setHistory((previous) => [...previous, { tone: draft.tone, sentAt: sent.sentAt }]);
    } catch (error) {
      started.current = false;
      setSendError(messageOf(error));
    } finally {
      setSending(false);
    }
  }

  return {
    history,
    sending,
    sendError,
    sentAt,
    started,
    clearError: () => setSendError(null),
    send,
  };
}
