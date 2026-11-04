"use client";

import { useRef, useState, type FormEvent } from "react";
import { toSplitRequest } from "@/components/invoices/deposit-plan";
import {
  describeHeld,
  fieldErrorsFromServer,
  toRequest,
  type FieldErrors,
  type HeldNotice,
  type InvoiceForm,
} from "@/components/invoices/invoice-form";
import { ApiClientError, createDepositAndBalance, createInvoice } from "@/lib/api-client";
import type { CreateInvoiceResponse, CreateSplitRequest, CreateSplitResponse } from "@/types";

// The server holds these two for a while, and the same form retried later gets its stored result.
const HELD_CODES = ["duplicate_request", "paypal_timeout"];

interface SubmitInvoice {
  pending: boolean;
  formError: string | null;
  held: HeldNotice | null;
  result: CreateInvoiceResponse | null;
  split: { request: CreateSplitRequest; response: CreateSplitResponse } | null;
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
  const [balanceRequestId] = useState(() => crypto.randomUUID());
  const [formError, setFormError] = useState<string | null>(null);
  const [held, setHeld] = useState<HeldNotice | null>(null);
  // The request body the server first held, to tell whether the form was edited since.
  const heldBody = useRef<string | null>(null);
  const [pending, setPending] = useState(false);
  // State only changes on the next render, so a second click in the same moment needs this flag.
  const running = useRef(false);
  const [result, setResult] = useState<CreateInvoiceResponse | null>(null);
  const [split, setSplit] = useState<SubmitInvoice["split"]>(null);

  async function run(): Promise<void> {
    if (running.current) return;

    const splitting = form.upfront !== "off";
    const checked = splitting
      ? toSplitRequest(form, { requestId, balanceRequestId }, today)
      : toRequest(form, requestId, today);
    if (!checked.ok) {
      setErrors(checked.errors);
      return;
    }

    running.current = true;
    setPending(true);
    setFormError(null);
    setHeld(null);
    try {
      if ("balanceRequestId" in checked.request) {
        const request = checked.request;
        setSplit({ request, response: await createDepositAndBalance(request) });
      } else {
        setResult(await createInvoice(checked.request));
      }
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
      running.current = false;
      setPending(false);
    }
  }

  return {
    pending,
    formError,
    held,
    result,
    split,
    submit: (event) => {
      event.preventDefault();
      void run();
    },
  };
}
