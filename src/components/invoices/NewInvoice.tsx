"use client";

import { useState } from "react";
import { blankForm, formFromDraft, type InvoiceForm } from "@/components/invoices/invoice-form";
import { PasteStep, type Drafted } from "@/components/invoices/PasteStep";
import { ReviewStep } from "@/components/invoices/ReviewStep";
import type { ClientRisk } from "@/types";

interface Review {
  form: InvoiceForm;
  warnings: string[];
  notice: string | null;
  risk: ClientRisk | null;
}

export function NewInvoice() {
  const [review, setReview] = useState<Review | null>(null);
  // A new form gets a new request ID, so a counter remounts the review step.
  const [formNumber, setFormNumber] = useState(0);

  function onDrafted({ draft, warnings, notice, risk }: Drafted) {
    setReview({ form: draft ? formFromDraft(draft) : blankForm(), warnings, notice, risk });
    setFormNumber((number) => number + 1);
  }

  if (!review) return <PasteStep onDrafted={onDrafted} />;
  return <ReviewStep key={formNumber} initial={review} onCreateAnother={() => setReview(null)} />;
}
