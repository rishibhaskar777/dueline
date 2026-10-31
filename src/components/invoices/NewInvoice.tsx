"use client";

import { useState } from "react";
import { blankForm, formFromDraft, type InvoiceForm } from "@/components/invoices/invoice-form";
import { PasteStep, type Drafted } from "@/components/invoices/PasteStep";
import { ReviewStep } from "@/components/invoices/ReviewStep";
import { useProfile } from "@/components/profile/use-profile";
import { usePrefill, type Prefill } from "@/components/invoices/use-prefill";
import type { ClientRisk } from "@/types";

interface Review {
  form: InvoiceForm;
  warnings: string[];
  notice: string | null;
  risk: ClientRisk | null;
}

export function NewInvoice({ prefill }: { prefill: Prefill }) {
  const { profile, error: profileError } = useProfile();
  const [review, setReview] = useState<Review | null>(null);
  // A new form gets a new request ID, so a counter remounts the review step.
  const [formNumber, setFormNumber] = useState(0);
  const profileReady = profile !== null || profileError !== null;
  const prefilled = usePrefill(prefill, profile?.defaultSac ?? "", profileReady);

  function onDrafted({ draft, warnings, notice, risk }: Drafted) {
    setReview({
      form: draft ? formFromDraft(draft) : blankForm(profile?.defaultSac ?? ""),
      warnings,
      notice,
      risk,
    });
    setFormNumber((number) => number + 1);
  }

  if (prefilled.kind === "loading") {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Getting the invoice ready…
      </p>
    );
  }
  const shown = review ?? (prefilled.kind === "ready" ? prefilled.review : null);
  if (!shown) return <PasteStep onDrafted={onDrafted} />;
  return (
    <ReviewStep
      key={review ? formNumber : "prefilled"}
      initial={shown}
      profile={profile}
      onCreateAnother={() => {
        setReview(null);
        prefilled.clear();
      }}
    />
  );
}
