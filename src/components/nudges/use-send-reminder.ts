"use client";

import { useRef, useState, type RefObject } from "react";
import { sendReminder } from "@/lib/api-client";
import type { ReminderChannel, ReminderDraft } from "@/types";

export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong. Try again in a moment.";
}

interface ReminderToSend {
  draft: ReminderDraft;
  channel: ReminderChannel;
  // One ID per draft and channel, reused for every retry, so one draft is never recorded twice.
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

  async function send({ draft, channel, requestId }: ReminderToSend): Promise<void> {
    if (sending) return;
    setSending(true);
    started.current = true;
    setSendError(null);
    try {
      const sent = await sendReminder({
        invoiceId: draft.invoiceId,
        tone: draft.tone,
        channel,
        requestId,
      });
      setSentAt(sent.sentAt);
      onSent();
      setHistory((previous) => [...previous, { tone: draft.tone, sentAt: sent.sentAt, channel }]);
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
