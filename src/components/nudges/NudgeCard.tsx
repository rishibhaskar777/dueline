"use client";

import { useId, useState } from "react";
import { LanguageSuggestion } from "@/components/shared/LanguageSuggestion";
import { PAYPAL_HEADS_UP_REFUSED } from "@/lib/reminders/heads-up-refusal";
import { PromiseControl } from "@/components/shared/PromiseControl";
import { collapsedLine } from "@/components/shared/promise-model";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { clientKey } from "@/lib/risk/client-key";
import { DraftStatus } from "./DraftStatus";
import { EmailMessageActions } from "./EmailMessageActions";
import { EmailPreviewPanel } from "./EmailPreviewPanel";
import { LanguageNote } from "./LanguageNote";
import { NudgeHeader } from "./NudgeHeader";
import {
  headsUpSentNote,
  paypalSentNote,
  payTimeLine,
  sendStates,
  sentMessage,
} from "./nudge-model";
import { ReplaceEditsPrompt } from "./ReplaceEditsPrompt";
import { SendPanel } from "./SendPanel";
import { ToneControl } from "./ToneControl";
import type { Nudge } from "./use-nudges";
import { useNudgeDraft, type ImproveDraft } from "./use-nudge-draft";
import type { PaymentPromise } from "@/types";

const ALL_SENT_TODAY =
  "A PayPal reminder and your own message have both gone out for this invoice today. Dueline sends one of each a day.";

interface NudgeCardProps extends Nudge {
  // PayPal's daily reminder limit is used up, so drafting stays open but sending is not.
  limitReached: boolean;
  improve: ImproveDraft;
  onSent: () => void;
}

// A late invoice whose client has promised a date shrinks to one line until that date has passed,
// and no draft is asked for while it is. "Remind anyway" opens the card as usual.
export function NudgeCard(props: NudgeCardProps) {
  const { draft, invoice, today } = props;
  const [promise, setPromise] = useState(draft.promise);
  const [expanded, setExpanded] = useState(false);
  const line = draft.tone === "heads_up" || expanded ? null : collapsedLine(promise, today);

  if (line) {
    return (
      <li
        id={`invoice-${encodeURIComponent(invoice.id)}`}
        className="flex scroll-mt-6 flex-wrap items-center justify-between gap-3 surface px-5 py-4 sm:px-7"
      >
        <div className="min-w-0 text-[15px]">
          <h2 className="inline font-heading text-lg font-extrabold">{invoice.client.name}</h2>
          <span className="text-muted-foreground">
            {" "}
            · Invoice {invoice.number} · {line}
          </span>
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-10 px-4 font-bold"
          onClick={() => setExpanded(true)}
        >
          Remind anyway
        </Button>
      </li>
    );
  }
  return (
    <OpenNudgeCard
      {...props}
      promise={promise}
      onPromiseChange={(next) => setPromise(next ?? undefined)}
    />
  );
}

interface OpenNudgeCardProps extends NudgeCardProps {
  promise: PaymentPromise | undefined;
  onPromiseChange: (promise: PaymentPromise | null) => void;
}

function OpenNudgeCard({
  draft: initial,
  invoice,
  today,
  paySpeed,
  limitReached,
  improve,
  onSent,
  promise,
  onPromiseChange,
}: OpenNudgeCardProps) {
  const id = useId();
  const nudge = useNudgeDraft(initial, improve, onSent);
  const [previewing, setPreviewing] = useState(false);
  const { draft, drafting, sending, closed, sentVia, sentAt, pendingRedraft } = nudge;
  const busy = drafting || sending;
  const locked = busy || closed;
  const states = sendStates(sentVia);
  const paypalNote = paypalSentNote(nudge.history);
  const headsUp = initial.tone === "heads_up";
  const headsUpNote = headsUpSentNote(nudge.history);

  return (
    <li
      id={`invoice-${encodeURIComponent(invoice.id)}`}
      className="grid scroll-mt-6 gap-7 surface p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_300px]"
    >
      <div className="grid min-w-0 content-start gap-4">
        <NudgeHeader
          invoice={invoice}
          history={nudge.history}
          dueSoon={headsUp ? { today } : null}
        />
        {!headsUp && (
          <div className="self-start">
            <ToneControl
              tone={draft.tone}
              suggestedTone={draft.suggestedTone}
              disabled={locked}
              onChange={nudge.switchTone}
            />
          </div>
        )}
        <p className="text-[15px] text-muted-foreground">{draft.reason}</p>
        {!headsUp && (
          <PromiseControl
            invoiceId={invoice.id}
            today={today}
            promise={promise}
            onChange={onPromiseChange}
          />
        )}
        {nudge.languageSuggestion && (
          <LanguageSuggestion
            clientKey={clientKey(invoice.client.name)}
            clientName={invoice.client.name}
            country={invoice.client.country}
            suggestion={nudge.languageSuggestion}
            disabled={busy}
            onChosen={nudge.adoptClientLanguage}
          />
        )}
        <LanguageNote
          clientLanguage={nudge.clientLanguage}
          language={draft.language}
          disabled={locked}
          onChange={nudge.switchLanguage}
        />
        {pendingRedraft && !locked && (
          <ReplaceEditsPrompt
            tone={pendingRedraft.tone}
            language={pendingRedraft.language}
            onReplace={nudge.replaceEdits}
            onKeepEditing={nudge.keepEditing}
          />
        )}
        {nudge.draftError && (
          <p role="alert" className="text-sm text-late">
            {nudge.draftError}
          </p>
        )}

        <div className="grid gap-1.5" aria-busy={drafting || nudge.improving}>
          <Label htmlFor={`${id}-subject`} className="font-bold">
            Subject
          </Label>
          <Input
            id={`${id}-subject`}
            value={nudge.subject}
            disabled={locked}
            onChange={(event) => nudge.setSubject(event.target.value)}
          />
          <Label htmlFor={`${id}-message`} className="mt-2.5 font-bold">
            Message
          </Label>
          <Textarea
            id={`${id}-message`}
            rows={11}
            value={nudge.message}
            disabled={locked}
            onChange={(event) => nudge.setMessage(event.target.value)}
            className="rounded-2xl p-4 leading-[1.6]"
          />
          <DraftStatus nudge={nudge} />
        </div>
      </div>

      <div className="grid min-w-0 content-start gap-3.5">
        {headsUpNote && (
          <p
            role="status"
            className="rounded-xl bg-tint-green px-3.5 py-2.5 text-sm font-bold text-paid"
          >
            {headsUpNote}
          </p>
        )}
        <SendPanel title="Send PayPal reminder">
          <p className="text-sm leading-normal text-muted-foreground">
            PayPal emails its standard reminder with a Pay now button. PayPal writes the wording.
          </p>
          {nudge.paypalRefused ? (
            <p role="status" className="text-sm font-semibold text-due-soon">
              {PAYPAL_HEADS_UP_REFUSED}
            </p>
          ) : states.paypal === "sent" && paypalNote && !headsUp ? (
            <p className="rounded-xl bg-tint-green px-3.5 py-2.5 text-sm font-bold text-paid">
              {paypalNote}
            </p>
          ) : (
            <Button
              type="button"
              className="h-11 justify-self-start px-5 font-bold"
              disabled={busy || closed || sentVia.paypal || limitReached}
              onClick={() => nudge.send("paypal")}
            >
              {sending ? "Sending…" : "Send PayPal reminder"}
            </Button>
          )}
        </SendPanel>
        <EmailMessageActions
          to={invoice.client.email}
          subject={nudge.subject}
          message={nudge.message}
          payLink={invoice.payLink}
          disabled={busy || closed || states.email === "sent"}
          sentToday={states.email === "sent" && !headsUp}
          confirming={sending}
          onConfirm={() => nudge.send("email")}
          previewId={`${id}-email-preview`}
          previewing={previewing}
          onTogglePreview={() => setPreviewing((value) => !value)}
        />
        {paySpeed && (
          <p className="text-sm text-muted-foreground">
            {payTimeLine(invoice.client.name, paySpeed)}
          </p>
        )}
        {sentAt && !headsUp && (
          <p role="status" className="text-sm font-semibold text-paid">
            {sentMessage(sentAt, nudge.history.at(-1)?.channel ?? "paypal")}
          </p>
        )}
        {closed && !headsUp && <p className="text-sm text-muted-foreground">{ALL_SENT_TODAY}</p>}
        {nudge.sendError && (
          <p role="alert" className="text-sm text-late">
            {nudge.sendError}
          </p>
        )}
      </div>

      {previewing && (
        <div className="lg:col-span-2">
          <EmailPreviewPanel
            id={`${id}-email-preview`}
            to={invoice.client.email}
            subject={nudge.subject}
            message={nudge.message}
            payLink={invoice.payLink}
          />
        </div>
      )}
    </li>
  );
}
