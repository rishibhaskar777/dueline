"use client";

import { useRef, useState, type RefObject } from "react";
import { ApiClientError, sendReminder } from "@/lib/api-client";
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
  // PayPal refused this heads-up reminder, so only the freelancer's own message is offered.
  paypalRefused: boolean;
  // True from the moment a send starts until it fails, so a late answer cannot change the text.
  started: RefObject<boolean>;
  clearError: () => void;
  send: (reminder: ReminderToSend) => Promise<void>;
}

// The server answers 409 only when PayPal turned down a heads-up reminder; the card then says so in
// the PayPal panel instead of as an error.
function isPayPalHeadsUpRefusal(
  error: unknown,
  draft: ReminderDraft,
  channel: ReminderChannel,
): boolean {
  return (
    error instanceof ApiClientError &&
    error.status === 409 &&
    draft.tone === "heads_up" &&
    channel === "paypal"
  );
}

export function useSendReminder(
  initialHistory: ReminderDraft["history"],
  initialPayPalRefused: boolean,
  onSent: () => void,
): SendState {
  const [history, setHistory] = useState(initialHistory);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sentAt, setSentAt] = useState<string | null>(null);
  const [paypalRefused, setPayPalRefused] = useState(initialPayPalRefused);
  const started = useRef(false);
  const running = useRef(false);

  async function send({ draft, channel, requestId }: ReminderToSend): Promise<void> {
    if (running.current) return;
    running.current = true;
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
      if (isPayPalHeadsUpRefusal(error, draft, channel)) setPayPalRefused(true);
      else setSendError(messageOf(error));
    } finally {
      running.current = false;
      setSending(false);
    }
  }

  return {
    history,
    sending,
    sendError,
    sentAt,
    paypalRefused,
    started,
    clearError: () => setSendError(null),
    send,
  };
}
