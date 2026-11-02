"use client";

import { useState } from "react";
import { useDemoMode } from "@/components/demo/use-demo-mode";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { emailLinks } from "./nudge-email";
import { SendPanel } from "./SendPanel";

const SMALL = "h-10 px-4 text-sm font-bold";

interface EmailMessageActionsProps {
  to: string;
  subject: string;
  message: string;
  payLink: string;
  // Sending is closed for this card, or a send is under way.
  disabled: boolean;
  // A message from the freelancer's email was already recorded today.
  sentToday: boolean;
  confirming: boolean;
  onConfirm: () => void;
  // The preview itself is drawn by the card, across its whole width.
  previewId: string;
  previewing: boolean;
  onTogglePreview: () => void;
}

// Opening or copying records nothing. Only "I sent it" does, once the freelancer has really sent it.
export function EmailMessageActions({
  to,
  subject,
  message,
  payLink,
  disabled,
  sentToday,
  confirming,
  onConfirm,
  previewId,
  previewing,
  onTogglePreview,
}: EmailMessageActionsProps) {
  const inDemo = useDemoMode();
  const [prepared, setPrepared] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const links = emailLinks(to, subject, message, payLink);

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(links.body);
      setCopyFailed(false);
      setPrepared(true);
    } catch {
      setCopyFailed(true);
    }
  }

  const secondary = cn(buttonVariants({ variant: "outline" }), SMALL);
  return (
    <SendPanel title="Send my message">
      <p className="text-sm leading-normal text-muted-foreground">
        Opens your own email with the message above and the Pay here link before your sign-off.
      </p>
      {links.mailto === null && (
        <p className="text-sm text-muted-foreground">
          This message is too long for an email link, so use Gmail or copy it.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <a
          href={disabled ? undefined : links.gmail}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={disabled}
          className={cn(buttonVariants(), SMALL)}
          onClick={() => !disabled && setPrepared(true)}
        >
          Open in Gmail
        </a>
        {links.mailto !== null && (
          <a
            href={disabled ? undefined : links.mailto}
            aria-disabled={disabled}
            aria-label="Open in email app"
            className={secondary}
            onClick={() => !disabled && setPrepared(true)}
          >
            Email app
          </a>
        )}
        <Button
          type="button"
          variant="outline"
          className={SMALL}
          aria-label="Copy message"
          disabled={disabled}
          onClick={() => void copy()}
        >
          Copy
        </Button>
        <Button
          type="button"
          variant="outline"
          className={SMALL}
          aria-expanded={previewing}
          aria-controls={previewing ? previewId : undefined}
          onClick={onTogglePreview}
        >
          {previewing ? "Hide preview" : "Preview"}
        </Button>
      </div>
      {inDemo && (
        <p className="text-[13px] text-subtle">
          In the demo this goes to the PayPal sandbox buyer.
        </p>
      )}
      {sentToday && (
        <p className="rounded-xl bg-tint-green px-3.5 py-2.5 text-sm font-semibold text-paid">
          A message from your email was already recorded today.
        </p>
      )}
      {copyFailed && (
        <p role="alert" className="text-sm text-late">
          Could not copy. Select the message and copy it yourself.
        </p>
      )}
      {prepared && !disabled && (
        <div className="grid gap-2">
          <Button type="button" className={SMALL} disabled={confirming} onClick={onConfirm}>
            {confirming ? "Saving…" : "I sent it"}
          </Button>
          <p className="text-sm text-muted-foreground">
            Press this after you send it, so Dueline can keep the record.
          </p>
        </div>
      )}
    </SendPanel>
  );
}
