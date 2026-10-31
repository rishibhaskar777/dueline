"use client";

import { useRef, useState, type FormEvent } from "react";
import {
  describeHeld,
  fieldErrorsFromServer,
  toRequest,
  type FieldErrors,
  type HeldNotice,
  type InvoiceForm,
} from "@/components/invoices/invoice-form";
import { ApiClientError, createInvoice } from "@/lib/api-client";
import type { CreateInvoiceResponse } from "@/types";

// The server holds these two for a while, and the same form retried later gets its stored result.
const HELD_CODES = ["duplicate_request", "paypal_timeout"];

interface SubmitInvoice {
  pending: boolean;
  formError: string | null;
  held: HeldNotice | null;
  result: CreateInvoiceResponse | null;
  submit: (event: FormEvent<HTMLFormElement>) => void;
}

function describeFailure(error: unknown): string {
  if (!(error instanceof Error)) return "Could not create the invoice.";
  const debugId = error instanceof ApiClientError ? error.debugId : undefined;
  return debugId ? `${error.message} (PayPal debug ID ${debugId})` : error.message;
}

export function useSubmitInvoice(
  form: InvoiceForm,
  today: string | undefined,
  setErrors: (errors: FieldErrors) => void,
): SubmitInvoice {
  // One ID for this form, reused for every retry, so PayPal never gets two invoices from one form.
  const [requestId] = useState(() => crypto.randomUUID());
  const [formError, setFormError] = useState<string | null>(null);
  const [held, setHeld] = useState<HeldNotice | null>(null);
  // The request body the server first held, to tell whether the form was edited since.
  const heldBody = useRef<string | null>(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<CreateInvoiceResponse | null>(null);

  async function run(): Promise<void> {
    if (pending) return;

    const checked = toRequest(form, requestId, today);
    if (!checked.ok) {
      setErrors(checked.errors);
      return;
    }

    setPending(true);
    setFormError(null);
    setHeld(null);
    try {
      setResult(await createInvoice(checked.request));
    } catch (caught) {
      if (caught instanceof ApiClientError && HELD_CODES.includes(caught.code)) {
        const body = JSON.stringify(checked.request);
        heldBody.current ??= body;
        setHeld(describeHeld(caught.code, caught.message, heldBody.current !== body));
      } else if (caught instanceof ApiClientError && caught.code === "invalid_request") {
        const fields = fieldErrorsFromServer(caught.message);
        if (fields) setErrors(fields);
        else setFormError(caught.message);
      } else {
        setFormError(describeFailure(caught));
      }
    } finally {
      setPending(false);
    }
  }

  return {
    pending,
    formError,
    held,
    result,
    submit: (event) => {
      event.preventDefault();
      void run();
    },
  };
}
