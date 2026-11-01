"use client";

import { useEffect, useState } from "react";
import { toLoadError, type LoadError } from "@/components/shared/load-error";
import { getClients, getInvoices, getReminders } from "@/lib/api-client";
import { clientKey } from "@/lib/risk/client-key";
import type { ClientSummary, InvoiceSummary, PaySpeed, ReminderDraft } from "@/types";

export interface Nudge {
  draft: ReminderDraft;
  invoice: InvoiceSummary;
  // How long this client takes to pay, when anything of theirs was paid in the last 12 months.
  paySpeed: PaySpeed | null;
}

type NudgesState =
  | { kind: "loading" }
  | { kind: "error"; error: LoadError }
  | { kind: "ready"; nudges: Nudge[]; remindersLeftToday: number };

interface NudgesData {
  state: NudgesState;
  retry: () => void;
}

function pair(
  drafts: ReminderDraft[],
  invoices: InvoiceSummary[],
  clients: ClientSummary[],
): Nudge[] {
  return drafts.flatMap((draft) => {
    const invoice = invoices.find(({ id }) => id === draft.invoiceId);
    if (!invoice) return [];
    const key = clientKey(invoice.client.name);
    return [{ draft, invoice, paySpeed: clients.find((c) => c.key === key)?.paySpeed ?? null }];
  });
}

export function useNudges(): NudgesData {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<NudgesState>({ kind: "loading" });

  useEffect(() => {
    let active = true;
    // The pay speed is a small extra: the cards still open without it.
    Promise.all([getReminders(), getInvoices(), getClients().catch(() => [])]).then(
      ([{ drafts, remindersLeftToday }, { invoices }, clients]) => {
        if (active) {
          setState({
            kind: "ready",
            nudges: pair(drafts, invoices, clients),
            remindersLeftToday,
          });
        }
      },
      (error) => {
        if (active) setState({ kind: "error", error: toLoadError(error) });
      },
    );
    return () => {
      active = false;
    };
  }, [attempt]);

  function retry(): void {
    setState({ kind: "loading" });
    setAttempt((count) => count + 1);
  }

  return { state, retry };
}
