"use client";

import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NudgeHeader } from "./NudgeHeader";
import { sentMessage, sourceNote, toneReason } from "./nudge-model";
import { ReplaceEditsPrompt } from "./ReplaceEditsPrompt";
import { ToneSwitch } from "./ToneSwitch";
import type { Nudge } from "./use-nudges";
import { useNudgeDraft } from "./use-nudge-draft";

const ALREADY_SENT_TODAY =
  "A reminder was already sent for this invoice today. Dueline sends one a day.";

interface NudgeCardProps extends Nudge {
  // PayPal's daily reminder limit is used up, so drafting stays open but sending is not.
  limitReached: boolean;
  onSent: () => void;
}

export function NudgeCard({ draft: initial, invoice, limitReached, onSent }: NudgeCardProps) {
  const id = useId();
  const nudge = useNudgeDraft(initial, onSent);
  const { draft, drafting, sending, closed, sentAt } = nudge;
  const locked = drafting || sending || closed;

  return (
    <li className="rounded-xl border border-line bg-white p-6">
      <NudgeHeader invoice={invoice} history={nudge.history} />

      <div className="mt-5 grid gap-4">
        <ToneSwitch
          tone={draft.tone}
          suggestedTone={draft.suggestedTone}
          disabled={locked}
          onChange={nudge.switchTone}
        />
        {toneReason(invoice, draft) && (
          <p className="text-sm text-muted-foreground">{toneReason(invoice, draft)}</p>
        )}
        {nudge.pendingTone && !locked && (
          <ReplaceEditsPrompt
            tone={nudge.pendingTone}
            onReplace={nudge.replaceEdits}
            onKeepEditing={nudge.keepEditing}
          />
        )}
        {nudge.draftError && (
          <p role="alert" className="text-sm text-late">
            {nudge.draftError}
          </p>
        )}

        <div className="grid gap-1.5" aria-busy={drafting}>
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
          <p role="status" className="text-xs text-muted-foreground">
            {drafting ? "Writing a new draft…" : sourceNote(draft.source)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <Button type="button" disabled={locked || limitReached} onClick={nudge.send}>
            {sending ? "Sending…" : "Send reminder through PayPal"}
          </Button>
          {sentAt && (
            <p role="status" className="text-sm font-medium text-paid">
              {sentMessage(sentAt)}
            </p>
          )}
          {closed && !sentAt && (
            <p className="text-sm text-muted-foreground">{ALREADY_SENT_TODAY}</p>
          )}
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
