"use client";

import { useEffect, useMemo, useState } from "react";
import {
  blankForm,
  formFromInvoice,
  formFromRepeat,
  type InvoiceForm,
} from "@/components/invoices/invoice-form";
import { getInvoiceDetail, getRepeats } from "@/lib/api-client";
import type { ClientRisk } from "@/types";

export interface Prefill {
  // Both are checked on the page before they get here.
  clientName: string | null;
  duplicateId: string | null;
  repeatId: string | null;
}

interface PrefilledReview {
  form: InvoiceForm;
  warnings: string[];
  notice: string | null;
  risk: ClientRisk | null;
}

type Prefilled =
  { kind: "loading" } | { kind: "none" } | { kind: "ready"; review: PrefilledReview };

const COULD_NOT_FIND_REPEAT =
  "We couldn't find that monthly repeat. It may have been deleted. Start a new invoice instead.";

const FROM_REPEAT =
  "Prepared by your monthly repeat. Choose the due date and check the items, then send it.";

const COULD_NOT_COPY =
  "We couldn't copy that invoice. Paste a chat or start without one to make a new invoice.";

function review(form: InvoiceForm, warnings: string[] = []): PrefilledReview {
  return { form, warnings, notice: null, risk: null };
}

// An invoice for a known client, or a copy of an earlier invoice, skips the chat and opens the
// review step. The profile is waited for so the default SAC is on the items.
export function usePrefill(
  { clientName, duplicateId, repeatId }: Prefill,
  defaultSac: string,
  profileReady: boolean,
): Prefilled & { clear: () => void } {
  const [copied, setCopied] = useState<PrefilledReview | null>(null);
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    if (duplicateId === null || !profileReady) return;
    let active = true;
    getInvoiceDetail(duplicateId).then(
      (detail) => active && setCopied(review(formFromInvoice(detail, defaultSac))),
      () => active && setCopied(review(blankForm(defaultSac), [COULD_NOT_COPY])),
    );
    return () => {
      active = false;
    };
  }, [duplicateId, profileReady, defaultSac]);

  useEffect(() => {
    if (repeatId === null || !profileReady) return;
    let active = true;
    const missing = () => review(blankForm(defaultSac), [COULD_NOT_FIND_REPEAT]);
    getRepeats().then(
      (repeats) => {
        const found = repeats.find(({ id }) => id === repeatId);
        if (active)
          setCopied(found ? review(formFromRepeat(found, defaultSac), [FROM_REPEAT]) : missing());
      },
      () => active && setCopied(missing()),
    );
    return () => {
      active = false;
    };
  }, [repeatId, profileReady, defaultSac]);

  const named = useMemo(
    () => (clientName === null ? null : review({ ...blankForm(defaultSac), clientName })),
    [clientName, defaultSac],
  );

  const fromSaved = duplicateId !== null || repeatId !== null;
  const wanted = fromSaved || clientName !== null;
  const ready = fromSaved ? copied : profileReady ? named : null;
  let state: Prefilled = { kind: "none" };
  if (wanted && !cleared) state = ready ? { kind: "ready", review: ready } : { kind: "loading" };
  return { ...state, clear: () => setCleared(true) };
}
