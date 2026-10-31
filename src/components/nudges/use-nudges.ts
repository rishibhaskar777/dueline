"use client";

import { useEffect, useState } from "react";
import { toLoadError, type LoadError } from "@/components/shared/load-error";
import { getInvoices, getReminders } from "@/lib/api-client";
import type { InvoiceSummary, ReminderDraft } from "@/types";

export interface Nudge {
  draft: ReminderDraft;
  invoice: InvoiceSummary;
}

type NudgesState =
  { kind: "loading" } | { kind: "error"; error: LoadError } | { kind: "ready"; nudges: Nudge[] };

interface NudgesData {
  state: NudgesState;
  retry: () => void;
}

function pair(drafts: ReminderDraft[], invoices: InvoiceSummary[]): Nudge[] {
  return drafts.flatMap((draft) => {
    const invoice = invoices.find(({ id }) => id === draft.invoiceId);
    return invoice ? [{ draft, invoice }] : [];
  });
}

export function useNudges(): NudgesData {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<NudgesState>({ kind: "loading" });

  useEffect(() => {
    let active = true;
    Promise.all([getReminders(), getInvoices()]).then(
      ([drafts, { invoices }]) => {
        if (active) setState({ kind: "ready", nudges: pair(drafts, invoices) });
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
