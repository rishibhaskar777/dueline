"use client";

import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmailMessageActions } from "./EmailMessageActions";
import { LanguageNote } from "./LanguageNote";
import { NudgeHeader } from "./NudgeHeader";
import { sentMessage } from "./nudge-model";
import { DraftStatus } from "./DraftStatus";
import { ReplaceEditsPrompt } from "./ReplaceEditsPrompt";
import { ToneSwitch } from "./ToneSwitch";
import type { Nudge } from "./use-nudges";
import { useNudgeDraft, type ImproveDraft } from "./use-nudge-draft";

const ALL_SENT_TODAY =
  "A PayPal reminder and your own message have both gone out for this invoice today. Dueline sends one of each a day.";

interface NudgeCardProps extends Nudge {
  // PayPal's daily reminder limit is used up, so drafting stays open but sending is not.
  limitReached: boolean;
  improve: ImproveDraft;
  onSent: () => void;
}

export function NudgeCard({
  draft: initial,
  invoice,
  paySpeed,
  limitReached,
  improve,
  onSent,
}: NudgeCardProps) {
  const id = useId();
  const nudge = useNudgeDraft(initial, improve, onSent);
  const { draft, drafting, sending, closed, sentVia, sentAt, pendingRedraft } = nudge;
  const busy = drafting || sending;
  const locked = busy || closed;

  return (
    <li
      id={`invoice-${encodeURIComponent(invoice.id)}`}
      className="scroll-mt-6 rounded-xl border border-line bg-card p-6"
    >
      <NudgeHeader invoice={invoice} paySpeed={paySpeed} history={nudge.history} />

      <div className="mt-5 grid gap-4">
        <ToneSwitch
          tone={draft.tone}
          suggestedTone={draft.suggestedTone}
          disabled={locked}
          onChange={nudge.switchTone}
        />
        <p className="text-sm text-muted-foreground">{draft.reason}</p>
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
          <Label htmlFor={`${id}-subject`}>Subject</Label>
          <Input
            id={`${id}-subject`}
            value={nudge.subject}
            disabled={locked}
            onChange={(event) => nudge.setSubject(event.target.value)}
          />
          <Label htmlFor={`${id}-message`} className="mt-2">
            Message
          </Label>
          <Textarea
            id={`${id}-message`}
            rows={9}
            value={nudge.message}
            disabled={locked}
            onChange={(event) => nudge.setMessage(event.target.value)}
          />
          <DraftStatus nudge={nudge} />
        </div>

        <div className="flex flex-wrap items-start gap-x-8 gap-y-4">
          <div className="grid max-w-xs gap-1.5">
            <Button
              type="button"
              disabled={busy || sentVia.paypal || limitReached}
              onClick={() => nudge.send("paypal")}
            >
              {sending ? "Sending…" : "Send PayPal reminder"}
            </Button>
            <p className="text-sm text-muted-foreground">
              PayPal emails its standard reminder with a Pay now button. PayPal writes the wording.
            </p>
            {sentVia.paypal && (
              <p className="text-sm text-muted-foreground">
                A PayPal reminder was already sent today.
              </p>
            )}
          </div>
          <EmailMessageActions
            to={invoice.client.email}
            subject={nudge.subject}
            message={nudge.message}
            payLink={invoice.payLink}
            disabled={busy || sentVia.email}
            sentToday={sentVia.email}
            confirming={sending}
            onConfirm={() => nudge.send("email")}
          />
          {sentAt && (
            <p role="status" className="text-sm font-medium text-paid">
              {sentMessage(sentAt, nudge.history.at(-1)?.channel ?? "paypal")}
            </p>
          )}
          {closed && <p className="text-sm text-muted-foreground">{ALL_SENT_TODAY}</p>}
          {nudge.sendError && (
            <p role="alert" className="text-sm text-late">
              {nudge.sendError}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}
