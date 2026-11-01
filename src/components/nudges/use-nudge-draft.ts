"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { draftReminder } from "@/lib/api-client";
import type { ReminderDraft, ReminderLanguage, Tone } from "@/types";
import { hasEdits, improvedOutcome, wasSentToday } from "./nudge-model";
import { messageOf, useSendReminder } from "./use-send-reminder";

export type ImproveDraft = (
  invoiceId: string,
  tone: Tone,
  language: ReminderLanguage,
) => Promise<ReminderDraft>;

interface Text {
  subject: string;
  message: string;
}

// A change of tone or language that would replace what the user typed.
export interface PendingRedraft {
  tone: Tone;
  language: ReminderLanguage;
}

interface NudgeDraft {
  draft: ReminderDraft;
  // The language saved for the client, which the card can go back to after English.
  clientLanguage: ReminderLanguage;
  subject: string;
  message: string;
  history: ReminderDraft["history"];
  // The template is shown while the model's draft is on its way.
  improving: boolean;
  // A better draft arrived after the user had started editing, and their text was kept.
  keptYours: boolean;
  drafting: boolean;
  sending: boolean;
  draftError: string | null;
  sendError: string | null;
  sentAt: string | null;
  pendingRedraft: PendingRedraft | null;
  // Dueline sends one reminder per invoice a day, so a card that already sent one is closed.
  closed: boolean;
  setSubject: (subject: string) => void;
  setMessage: (message: string) => void;
  switchTone: (tone: Tone) => void;
  switchLanguage: (language: ReminderLanguage) => void;
  replaceEdits: () => void;
  keepEditing: () => void;
  send: () => void;
}

// What is in the boxes right now, kept in a ref too for answers that arrive later.
function useTypedText(initial: ReminderDraft): {
  text: Text;
  typed: RefObject<Text>;
  setText: (next: Text) => void;
} {
  const [text, setTextState] = useState<Text>({
    subject: initial.subject,
    message: initial.message,
  });
  const typed = useRef<Text>(text);

  function setText(next: Text): void {
    typed.current = next;
    setTextState(next);
  }

  return { text, typed, setText };
}

// The draft on the card. Each new one gets its own request ID, so a reminder is never sent twice
// from one draft but a fresh draft can be sent.
interface ShownDraft {
  draft: ReminderDraft;
  requestId: string;
  // Each request for a draft starts a turn, and only the latest turn's answer is used.
  startTurn: () => number;
  isLatest: (turn: number) => boolean;
  show: (next: ReminderDraft) => void;
  keep: (update: (current: ReminderDraft) => ReminderDraft) => void;
}

function useShownDraft(
  initial: ReminderDraft,
  setText: (next: Text) => void,
  clearSendError: () => void,
): ShownDraft {
  const [draft, setDraft] = useState(initial);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const turns = useRef(0);

  function show(next: ReminderDraft): void {
    setDraft(next);
    setText({ subject: next.subject, message: next.message });
    setRequestId(crypto.randomUUID());
    clearSendError();
  }

  return {
    draft,
    requestId,
    startTurn: () => ++turns.current,
    isLatest: (turn) => turn === turns.current,
    show,
    keep: setDraft,
  };
}

// A draft that arrived as a template is replaced by the model's draft, unless the user has typed
// or started sending in the meantime.
function useFirstImprovement(
  initial: ReminderDraft,
  improve: ImproveDraft,
  shown: ShownDraft,
  typed: RefObject<Text>,
  sendStarted: RefObject<boolean>,
): { improving: boolean; keptYours: boolean; cancel: () => void } {
  const { startTurn, isLatest, show, keep } = shown;
  const [improving, setImproving] = useState(initial.pending);
  const [keptYours, setKeptYours] = useState(false);

  useEffect(() => {
    if (!initial.pending) return;
    const turn = startTurn();
    improve(initial.invoiceId, initial.tone, initial.language).then(
      (better) => {
        if (!isLatest(turn)) return;
        setImproving(false);
        const outcome = improvedOutcome(initial, typed.current, sendStarted.current);
        if (outcome === "apply") show(better);
        if (outcome === "keep-edits") {
          keep((current) => ({ ...current, pending: false }));
          setKeptYours(better.source === "ai");
        }
      },
      () => {
        if (isLatest(turn)) setImproving(false);
      },
    );
    // The first draft is improved once; `show` and `keep` only set state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial, improve]);

  function cancel(): void {
    setImproving(false);
    setKeptYours(false);
  }

  return { improving, keptYours, cancel };
}

interface RedraftFlow {
  drafting: boolean;
  draftError: string | null;
  pendingRedraft: PendingRedraft | null;
  switchTone: (tone: Tone) => void;
  switchLanguage: (language: ReminderLanguage) => void;
  replaceEdits: () => void;
  keepEditing: () => void;
}

// One request for a draft in another tone or language; a newer request makes an older answer stale.
function useRedraftRequest(
  { draft, startTurn, isLatest, show }: ShownDraft,
  onStart: () => void,
): {
  drafting: boolean;
  draftError: string | null;
  redraft: (tone: Tone, language: ReminderLanguage) => Promise<void>;
} {
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);

  async function redraft(tone: Tone, language: ReminderLanguage): Promise<void> {
    const turn = startTurn();
    onStart();
    setDrafting(true);
    setDraftError(null);
    try {
      const next = await draftReminder(draft.invoiceId, tone, language);
      if (isLatest(turn)) show(next);
    } catch (error) {
      if (isLatest(turn)) setDraftError(messageOf(error));
    } finally {
      if (isLatest(turn)) setDrafting(false);
    }
  }

  return { drafting, draftError, redraft };
}

// Typed text is never replaced by a new tone or language without the user saying so.
function useRedraftFlow(
  shown: ShownDraft,
  typed: RefObject<Text>,
  sending: boolean,
  onStart: () => void,
): RedraftFlow {
  const { draft } = shown;
  const { drafting, draftError, redraft } = useRedraftRequest(shown, onStart);
  const [pendingRedraft, setPendingRedraft] = useState<PendingRedraft | null>(null);

  function change(tone: Tone, language: ReminderLanguage): void {
    if (drafting || sending) return;
    if (hasEdits(draft, typed.current)) setPendingRedraft({ tone, language });
    else void redraft(tone, language);
  }

  function replaceEdits(): void {
    if (pendingRedraft === null) return;
    const { tone, language } = pendingRedraft;
    setPendingRedraft(null);
    void redraft(tone, language);
  }

  return {
    drafting,
    draftError,
    pendingRedraft,
    switchTone: (tone) => tone !== draft.tone && change(tone, draft.language),
    switchLanguage: (language) => language !== draft.language && change(draft.tone, language),
    replaceEdits,
    keepEditing: () => setPendingRedraft(null),
  };
}

export function useNudgeDraft(
  initial: ReminderDraft,
  improve: ImproveDraft,
  onSent: () => void,
): NudgeDraft {
  const [clientLanguage] = useState(initial.language);
  const { text, typed, setText } = useTypedText(initial);
  const sender = useSendReminder(initial.history, onSent);
  const shown = useShownDraft(initial, setText, sender.clearError);
  const { cancel, ...improvement } = useFirstImprovement(
    initial,
    improve,
    shown,
    typed,
    sender.started,
  );
  const flow = useRedraftFlow(shown, typed, sender.sending, cancel);

  function send(): void {
    if (flow.drafting) return;
    flow.keepEditing();
    void sender.send({ draft: shown.draft, ...text, requestId: shown.requestId });
  }

  return {
    draft: shown.draft,
    clientLanguage,
    ...text,
    ...improvement,
    ...flow,
    history: sender.history,
    sending: sender.sending,
    sendError: sender.sendError,
    sentAt: sender.sentAt,
    closed: sender.sentAt !== null || wasSentToday(sender.history),
    setSubject: (subject) => setText({ ...typed.current, subject }),
    setMessage: (message) => setText({ ...typed.current, message }),
    send,
  };
}
