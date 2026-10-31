"use client";

import { useState, type FormEvent } from "react";
import { SAMPLE_CHAT } from "@/components/invoices/sample-chat";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiClientError, extractInvoice } from "@/lib/api-client";
import type { ClientRisk, ExtractResponse, InvoiceDraft } from "@/types";

const MAX_CHAT_LENGTH = 6000;
const NO_ITEMS_FOUND = "We couldn't find invoice items in that chat. Fill them in below.";

export interface Drafted {
  draft: InvoiceDraft | null;
  warnings: string[];
  notice: string | null;
  risk: ClientRisk | null;
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

function maskedNotice({ emails, phones }: ExtractResponse["masked"]): string {
  return `We hid ${plural(emails, "email", "emails")} and ${plural(phones, "phone number", "phone numbers")} before the AI read the chat.`;
}

interface PasteStepProps {
  onDrafted: (drafted: Drafted) => void;
}

export function PasteStep({ onDrafted }: PasteStepProps) {
  const [chat, setChat] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const { draft, warnings, masked, risk } = await extractInvoice(chat);
      onDrafted({ draft, warnings, notice: maskedNotice(masked), risk });
    } catch (caught) {
      if (caught instanceof ApiClientError && caught.code === "extraction_failed") {
        onDrafted({ draft: null, warnings: [NO_ITEMS_FOUND], notice: null, risk: null });
        return;
      }
      setError(caught instanceof Error ? caught.message : "Could not read the chat.");
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      aria-labelledby="paste-title"
      className="max-w-3xl rounded-xl border border-line bg-white p-6"
    >
      <h2 id="paste-title" className="text-xl font-semibold">
        Paste the client chat
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Dueline drafts the invoice for you to check. Nothing is sent until you click Create and send
        invoice.
      </p>

      <div className="mt-5 grid gap-1.5">
        <Label htmlFor="chat">Client chat</Label>
        <Textarea
          id="chat"
          rows={10}
          maxLength={MAX_CHAT_LENGTH}
          value={chat}
          onChange={(event) => setChat(event.target.value)}
          aria-describedby="chat-count"
          className="min-h-48"
        />
        <p id="chat-count" className="text-xs text-muted-foreground tabular-nums">
          {chat.length.toLocaleString("en-IN")} of {MAX_CHAT_LENGTH.toLocaleString("en-IN")}{" "}
          characters
        </p>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-late">
          {error}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button type="submit" disabled={pending || chat.trim() === ""}>
          {pending ? "Drafting…" : "Draft invoice"}
        </Button>
        <Button type="button" variant="link" onClick={() => setChat(SAMPLE_CHAT)}>
          Use a sample chat
        </Button>
        <Button
          type="button"
          variant="link"
          onClick={() => onDrafted({ draft: null, warnings: [], notice: null, risk: null })}
        >
          Start without a chat
        </Button>
      </div>
    </form>
  );
}
