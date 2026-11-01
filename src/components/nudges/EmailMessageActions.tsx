"use client";

import { useState } from "react";
import { useDemoMode } from "@/components/demo/use-demo-mode";
import { Button, buttonVariants } from "@/components/ui/button";
import { emailLinks } from "./nudge-email";

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

  const linkClass = buttonVariants({ variant: "outline" });
  return (
    <div className="grid max-w-md gap-2">
      <p className="text-sm font-medium">Send my message</p>
      <p className="text-sm text-muted-foreground">
        Sends the message above from your own email, with the invoice&apos;s Pay here link added at
        the end.
      </p>
      {inDemo && (
        <p className="text-sm text-muted-foreground">
          In the demo the client&apos;s address is the PayPal sandbox buyer, so your message goes to{" "}
          {to}.
        </p>
      )}
      {links.mailto === null && (
        <p className="text-sm text-muted-foreground">
          This message is too long for an email link, so use Gmail or copy it.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {links.mailto !== null && (
          <a
            href={disabled ? undefined : links.mailto}
            aria-disabled={disabled}
            className={linkClass}
            onClick={() => !disabled && setPrepared(true)}
          >
            Open in email app
          </a>
        )}
        <a
          href={disabled ? undefined : links.gmail}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={disabled}
          className={linkClass}
          onClick={() => !disabled && setPrepared(true)}
        >
          Open in Gmail
        </a>
        <Button type="button" variant="outline" disabled={disabled} onClick={() => void copy()}>
          Copy message
        </Button>
      </div>
      {sentToday && (
        <p className="text-sm text-muted-foreground">
          A message from your email was already recorded today.
        </p>
      )}
      {copyFailed && (
        <p role="alert" className="text-sm text-late">
          Could not copy. Select the message and copy it yourself.
        </p>
      )}
      {prepared && !disabled && (
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" disabled={confirming} onClick={onConfirm}>
            {confirming ? "Saving…" : "I sent it"}
          </Button>
          <p className="text-sm text-muted-foreground">
            Press this after you send it, so Dueline can keep the record.
          </p>
        </div>
      )}
    </div>
  );
}
