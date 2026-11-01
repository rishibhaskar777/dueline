"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveBankReference } from "@/lib/api-client";
import { formatDate } from "@/lib/format-date";
import { formatMoney, formatRupees } from "@/lib/money/format";
import type { ExportOutsideRow } from "@/types";

function BankTransferRow({ row }: { row: ExportOutsideRow }) {
  const [saved, setSaved] = useState(row.bankReference ?? "");
  const [typed, setTyped] = useState(saved);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(): Promise<void> {
    setBusy(true);
    setMessage(null);
    try {
      const stored = await saveBankReference(row.invoiceId, typed.trim());
      setSaved(stored ?? "");
      setTyped(stored ?? "");
      setMessage({ ok: true, text: stored ? "Saved." : "Cleared." });
    } catch (error) {
      setMessage({
        ok: false,
        text: error instanceof Error ? error.message : "Could not save the reference.",
      });
    } finally {
      setBusy(false);
    }
  }

  const inputId = `bank-reference-${row.invoiceId}`;
  return (
    <li className="grid gap-2 py-3 text-sm">
      <span className="flex flex-wrap justify-between gap-2">
        <span className="font-medium">
          {row.clientName} · {row.invoiceNumber}
        </span>
        <span className="tabular-nums">
          {formatMoney(row.foreign)} · {formatRupees(row.inrReceived)} · paid{" "}
          {formatDate(row.paidOn)}
        </span>
      </span>
      <span className="flex flex-wrap items-end gap-2">
        <span className="grid gap-1">
          <Label htmlFor={inputId}>FIRC or e-BRC number</Label>
          <Input
            id={inputId}
            value={typed}
            maxLength={40}
            autoComplete="off"
            onChange={(event) => setTyped(event.target.value)}
          />
        </span>
        <Button
          type="button"
          variant="outline"
          disabled={busy || typed.trim() === saved}
          onClick={() => void save()}
        >
          Save reference
        </Button>
        {!saved && <span className="text-due-soon">Reference missing</span>}
        {message && (
          <span
            role={message.ok ? "status" : "alert"}
            className={message.ok ? undefined : "text-late"}
          >
            {message.text}
          </span>
        )}
      </span>
    </li>
  );
}

// Payments recorded as bank transfers have no PayPal FIRA. The bank's FIRC or e-BRC is their proof, so
// the number is kept here and goes into the CSV for the CA.
export function BankTransfers({ rows }: { rows: ExportOutsideRow[] }) {
  if (rows.length === 0) return null;

  return (
    <section aria-labelledby="bank-title" className="rounded-xl border border-line bg-card p-6">
      <h2 id="bank-title" className="text-xl font-semibold">
        Bank transfers
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Recorded as paid outside PayPal, so they are not on PayPal&apos;s FIRA. Add the number from
        your bank&apos;s FIRC or e-BRC for each one. Rupees are at the ECB rate of the payment date.
      </p>
      <ul className="mt-2 divide-y divide-line">
        {rows.map((row) => (
          <BankTransferRow key={row.invoiceId} row={row} />
        ))}
      </ul>
    </section>
  );
}
