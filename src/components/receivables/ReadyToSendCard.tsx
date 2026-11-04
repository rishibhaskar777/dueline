"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { sendInvoiceDraft } from "@/lib/api-client";
import { formatDate } from "@/lib/format-date";
import { formatMoney } from "@/lib/money/format";
import type { InvoiceSummary } from "@/types";

interface ReadyToSendCardProps {
  invoices: InvoiceSummary[];
  onSent: () => void;
}

// Balance invoices saved as drafts. Sending is a click, never automatic.
export function ReadyToSendCard({ invoices, onSent }: ReadyToSendCardProps) {
  // One ID per invoice, kept for retries, so a double click sends it once.
  const requestIds = useRef(new Map<string, string>());
  const [sending, setSending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function send(invoice: InvoiceSummary): Promise<void> {
    let requestId = requestIds.current.get(invoice.id);
    if (!requestId) {
      requestId = crypto.randomUUID();
      requestIds.current.set(invoice.id, requestId);
    }
    setSending(invoice.id);
    setError(null);
    try {
      await sendInvoiceDraft(invoice.id, requestId);
      onSent();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not send the invoice.");
    } finally {
      setSending(null);
    }
  }

  if (invoices.length === 0) return null;

  return (
    <section
      aria-labelledby="ready-title"
      className="surface p-6 [--h2-size:22px] [--surface-radius:24px]"
    >
      <h2 id="ready-title">Ready to send</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Balance invoices saved as drafts. Send each one when the work is delivered.
      </p>
      <ul className="mt-3 grid gap-2.5">
        {invoices.map((invoice) => (
          <li
            key={invoice.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-line px-4 py-3"
          >
            <div className="grid gap-0.5">
              <Link
                href={`/invoices/${encodeURIComponent(invoice.id)}`}
                className="font-semibold text-link underline underline-offset-2"
              >
                {invoice.client.name}
              </Link>
              <span className="text-sm text-muted-foreground tabular-nums">
                Invoice {invoice.number} · due {formatDate(invoice.dueOn)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-heading text-xl font-extrabold tabular-nums">
                {formatMoney(invoice.amount)}
              </span>
              <Button
                type="button"
                disabled={sending !== null}
                onClick={() => void send(invoice)}
                aria-label={`Send balance for invoice ${invoice.number}`}
              >
                {sending === invoice.id ? "Sending…" : "Send balance"}
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="mt-3 text-sm text-late">
          {error}
        </p>
      )}
    </section>
  );
}
