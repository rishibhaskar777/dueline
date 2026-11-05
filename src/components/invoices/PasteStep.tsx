"use client";

import { Lock } from "lucide-react";
import { useState, type FormEvent } from "react";
import { CHAT_PLACEHOLDER, SAMPLE_CHAT } from "@/components/invoices/sample-chat";
import { maskedNotice } from "@/components/invoices/notice-pills";
import { StepHeader } from "@/components/invoices/StepHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiClientError, extractInvoice } from "@/lib/api-client";
import type { ClientRisk, InvoiceDraft, PaymentTerms } from "@/types";

const MAX_CHAT_LENGTH = 6000;
const NO_ITEMS_FOUND = "We couldn't find invoice items in that chat. Fill them in below.";

export interface Drafted {
  draft: InvoiceDraft | null;
  warnings: string[];
  notice: string | null;
  risk: ClientRisk | null;
  paymentTerms: PaymentTerms | null;
  // The chat as pasted, null when the invoice was not drafted from one.
  chat: string | null;
}

interface PasteStepProps {
  onDrafted: (drafted: Drafted) => void;
  startWithSample: boolean;
}

const PILL = "h-11 px-5 font-bold";

export function PasteStep({ onDrafted, startWithSample }: PasteStepProps) {
  const [chat, setChat] = useState(startWithSample ? SAMPLE_CHAT : "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // When the AI cannot be asked, filling the invoice in by hand is the way on.
  const [aiDown, setAiDown] = useState(false);

  const empty = chat.trim() === "";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setAiDown(false);
    try {
      const { draft, warnings, masked, risk, paymentTerms } = await extractInvoice(chat);
      onDrafted({ draft, warnings, notice: maskedNotice(masked), risk, paymentTerms, chat });
    } catch (caught) {
      if (caught instanceof ApiClientError && caught.code === "extraction_failed") {
        onDrafted({
          draft: null,
          warnings: [NO_ITEMS_FOUND],
          notice: null,
          risk: null,
          paymentTerms: null,
          chat,
        });
        return;
      }
      setAiDown(caught instanceof ApiClientError && caught.code === "ai_unavailable");
      setError(caught instanceof Error ? caught.message : "Could not read the chat.");
      setPending(false);
    }
  }

  return (
    <div className="grid gap-5">
      <StepHeader state="paste" />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <form
          onSubmit={onSubmit}
          aria-labelledby="new-invoice-title"
          className="grid gap-3.5 surface p-[26px]"
        >
          <Label htmlFor="chat" className="text-base font-bold">
            Client chat
          </Label>
          <Textarea
            id="chat"
            rows={12}
            maxLength={MAX_CHAT_LENGTH}
            value={chat}
            onChange={(event) => setChat(event.target.value)}
            placeholder={CHAT_PLACEHOLDER}
            aria-describedby="chat-hint chat-count"
            className="min-h-48 rounded-[18px] p-[18px] text-[17px] leading-[1.55] placeholder:text-subtle"
          />
          <p className="flex items-center gap-2 text-[13px] text-muted-foreground">
            <Lock aria-hidden className="size-4 shrink-0" />
            <span>
              <span id="chat-hint">Emails and phone numbers are hidden before the AI reads it</span>
              {" · "}
              <span id="chat-count" className="tabular-nums">
                {chat.length.toLocaleString("en-IN")} of {MAX_CHAT_LENGTH.toLocaleString("en-IN")}
              </span>
            </span>
          </p>

          {error && (
            <p role="alert" className="text-sm text-late">
              {error}
            </p>
          )}

          <div className="flex flex-wrap gap-2.5">
            <Button
              type="button"
              variant="outline"
              className={PILL}
              onClick={() => setChat(SAMPLE_CHAT)}
            >
              Use a sample chat
            </Button>
            <Button
              type="button"
              variant={aiDown ? "default" : "outline"}
              className={PILL}
              onClick={() =>
                onDrafted({
                  draft: null,
                  warnings: [],
                  notice: null,
                  risk: null,
                  paymentTerms: null,
                  chat: null,
                })
              }
            >
              Start without a chat
            </Button>
            <Button
              type="submit"
              className="h-11 px-6 font-bold"
              disabled={pending || empty}
              aria-describedby={empty ? "draft-hint" : undefined}
            >
              {pending ? "Drafting…" : "Draft invoice"}
            </Button>
          </div>
          {empty && (
            <p id="draft-hint" className="text-[13px] text-muted-foreground">
              Paste a chat or use the sample to start
            </p>
          )}
        </form>

        <aside className="grid gap-3.5">
          <section className="grid gap-3 rounded-[24px] bg-navy-card p-[26px] text-white">
            <h2 className="font-heading text-[22px] font-extrabold">What the AI does</h2>
            <p className="text-[15px] leading-[1.55] text-navy-card-muted">
              Finds the client, items, quantities, prices, currency and payment terms. Every number
              is checked in code against the chat.
            </p>
          </section>
          <section className="grid gap-2.5 surface p-[26px] [--surface-radius:24px]">
            <h2>What it never does</h2>
            <p className="text-[15px] leading-[1.55] text-muted-foreground">
              Send anything, read contact details, or invent a price that is not in the chat. Gaps
              become warnings you fix before sending.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
