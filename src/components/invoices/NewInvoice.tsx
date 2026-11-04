"use client";

import { useState } from "react";
import {
  blankForm,
  formFromDraft,
  lutIsCurrent,
  withUpfront,
  type InvoiceForm,
} from "@/components/invoices/invoice-form";
import { PasteStep, type Drafted } from "@/components/invoices/PasteStep";
import { ReviewStep } from "@/components/invoices/ReviewStep";
import { StepHeader } from "@/components/invoices/StepHeader";
import { useProfile } from "@/components/profile/use-profile";
import { useLoad } from "@/components/shared/use-load";
import { getHealth } from "@/lib/api-client";
import { useStepFocus } from "@/components/invoices/step-focus";
import { usePrefill, type Prefill } from "@/components/invoices/use-prefill";
import type { ClientRisk, PaymentTerms } from "@/types";

interface Review {
  form: InvoiceForm;
  warnings: string[];
  notice: string | null;
  risk: ClientRisk | null;
  paymentTerms: PaymentTerms | null;
  chat: string | null;
}

export function NewInvoice({ prefill }: { prefill: Prefill }) {
  const { profile, error: profileError } = useProfile();
  const [review, setReview] = useState<Review | null>(null);
  // A new form gets a new request ID, so a counter remounts the review step.
  const [formNumber, setFormNumber] = useState(0);
  const { state: health } = useLoad(getHealth);
  const today = health.kind === "ready" ? health.data.today : "";
  // Both are needed to start the form: the default SAC and whether the LUT line starts ticked.
  const profileReady = (profile !== null || profileError !== null) && health.kind !== "loading";
  const includeLutNote = lutIsCurrent(profile, today);
  const prefilled = usePrefill(prefill, profile?.defaultSac ?? "", includeLutNote, profileReady);

  useStepFocus(review || prefilled.kind !== "ready" || prefilled.review ? "review" : "paste");

  function onDrafted({ draft, warnings, notice, risk, paymentTerms, chat }: Drafted) {
    setReview({
      form: draft
        ? withUpfront(formFromDraft(draft, includeLutNote), paymentTerms?.upfrontPercent ?? null)
        : blankForm(profile?.defaultSac ?? "", includeLutNote),
      warnings,
      notice,
      risk,
      paymentTerms,
      chat,
    });
    setFormNumber((number) => number + 1);
  }

  if (prefilled.kind === "loading") {
    return (
      <div className="grid gap-5">
        <StepHeader state="review" />
        <p role="status" className="text-sm text-muted-foreground">
          Getting the invoice ready…
        </p>
      </div>
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
