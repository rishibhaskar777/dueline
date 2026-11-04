"use client";

import { useEffect, useMemo, useState } from "react";
import { toLoadError, type LoadError } from "@/components/shared/load-error";
import { recall, remember } from "@/lib/remembered";
import { isSnapshotOld } from "@/components/shared/snapshot-age";
import { getClients, getInvoices, getReminders } from "@/lib/api-client";
import { clientKey } from "@/lib/risk/client-key";
import type {
  ClientSummary,
  InvoicesResponse,
  InvoiceSummary,
  PaySpeed,
  ReminderDraft,
  RemindersResponse,
} from "@/types";

export interface Nudge {
  draft: ReminderDraft;
  invoice: InvoiceSummary;
  // The date the app is using, from the same reading of the invoices.
  today: string;
  // How long this client takes to pay, when anything of theirs was paid in the last 12 months.
  paySpeed: PaySpeed | null;
}

type NudgesState =
  | { kind: "loading" }
  | { kind: "error"; error: LoadError }
  | { kind: "ready"; nudges: Nudge[]; headsUps: Nudge[]; remindersLeftToday: number };

export interface NudgesData {
  state: NudgesState;
  // True while the invoices shown are old and a newer reading is on its way.
  updating: boolean;
  retry: () => void;
}

interface Parts {
  reminders: RemindersResponse | null;
  invoices: InvoicesResponse | null;
  // The invoices are an old reading of PayPal and a newer one is on its way.
  old: boolean;
  clients: ClientSummary[] | null;
}

const NOTHING_YET: Parts = { reminders: null, invoices: null, old: false, clients: null };

function withInvoices(previous: Parts, invoices: InvoicesResponse): Parts {
  return { ...previous, invoices, old: isSnapshotOld(invoices.loadedAt, Date.now()) };
}

const REMEMBERED_AS = "nudges";
const RECHECK_MS = 4000;
const RECHECKS = 5;

function pair(
  drafts: ReminderDraft[],
  { invoices, today }: InvoicesResponse,
  clients: ClientSummary[],
): Nudge[] {
  return drafts.flatMap((draft) => {
    const invoice = invoices.find(({ id }) => id === draft.invoiceId);
    if (!invoice) return [];
    const key = clientKey(invoice.client.name);
    return [
      { draft, invoice, today, paySpeed: clients.find((c) => c.key === key)?.paySpeed ?? null },
    ];
  });
}

export function useNudges(): NudgesData {
  const [attempt, setAttempt] = useState(0);
  const [parts, setParts] = useState<Parts>(() => recall<Parts>(REMEMBERED_AS) ?? NOTHING_YET);
  const [error, setError] = useState<LoadError | null>(null);

  useEffect(() => {
    let active = true;
    // The three are asked for together, and the cards draw once the drafts and invoices are in.
    // The pay speed is a small extra: the cards open without it.
    const failed = (failure: unknown): void => {
      if (active) setError(toLoadError(failure));
    };
    getReminders().then(
      (reminders) => active && setParts((previous) => ({ ...previous, reminders })),
      failed,
    );
    getInvoices().then(
      (invoices) => active && setParts((previous) => withInvoices(previous, invoices)),
      failed,
    );
    getClients().then(
      (clients) => active && setParts((previous) => ({ ...previous, clients })),
      () => undefined,
    );
    return () => {
      active = false;
    };
  }, [attempt]);

  useEffect(() => {
    if (parts.reminders && parts.invoices) remember(REMEMBERED_AS, parts);
  }, [parts]);

  const loadedAt = parts.invoices?.loadedAt ?? null;
  const updating = parts.old;
  const [rechecks, setRechecks] = useState(0);

  // Dueline answers from what it last read and reads PayPal again behind the answer, so look again
  // shortly for the newer reading.
  useEffect(() => {
    if (!updating || rechecks >= RECHECKS) return;
    const timer = window.setTimeout(() => {
      getInvoices().then(
        (invoices) => setParts((previous) => withInvoices(previous, invoices)),
        () => undefined,
      );
      setRechecks((count) => count + 1);
    }, RECHECK_MS);
    return () => window.clearTimeout(timer);
  }, [updating, rechecks, loadedAt]);

  const state = useMemo<NudgesState>(() => {
    if (parts.reminders && parts.invoices) {
      return {
        kind: "ready",
        nudges: pair(parts.reminders.drafts, parts.invoices, parts.clients ?? []),
        headsUps: pair(parts.reminders.headsUps ?? [], parts.invoices, parts.clients ?? []),
        remindersLeftToday: parts.reminders.remindersLeftToday,
      };
    }
    return error ? { kind: "error", error } : { kind: "loading" };
  }, [parts, error]);

  function retry(): void {
    setError(null);
    setParts(NOTHING_YET);
    setRechecks(0);
    setAttempt((count) => count + 1);
  }

  return { state, updating: updating && rechecks < RECHECKS, retry };
}
