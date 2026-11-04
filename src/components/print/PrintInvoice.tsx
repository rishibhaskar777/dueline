"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, type CSSProperties } from "react";
import { InvoiceDocument } from "@/components/print/InvoiceDocument";
import { NOT_UNDER_LUT_WARNING, buildPrintDocument } from "@/components/print/print-invoice";
import { useProfile } from "@/components/profile/use-profile";
import { LoadFailure } from "@/components/shared/LoadFailure";
import { useLoad } from "@/components/shared/use-load";
import { Button } from "@/components/ui/button";
import { getInvoiceDetail } from "@/lib/api-client";

const PRINT_STYLES = `@media print {
  @page { size: A4; margin: 14mm; }
  .dl-backdrop, .print-hide { display: none !important; }
  html, body { background: #fff !important; }
}`;

// The page is a light document in either theme, so its button keeps the light theme's dark fill.
const TOOLBAR_TOKENS = {
  "--btn-primary-bg": "#0d1b2e",
  "--btn-primary-edge": "#0d1b2e",
  "--btn-primary-shadow": "rgba(10, 20, 50, 0.22)",
  "--ring": "#1f47c7",
  "--background": "#ffffff",
} as CSSProperties;

export function PrintInvoice({ invoiceId }: { invoiceId: string }) {
  const load = useCallback(() => getInvoiceDetail(invoiceId), [invoiceId]);
  const { state, reload } = useLoad(load);
  const { profile, error: profileError, retry } = useProfile();
  const wantsPrint = useSearchParams().get("print") === "1";
  const printed = useRef(false);
  const ready = state.kind === "ready" && profile !== null;
  const notUnderLut = state.kind === "ready" && !state.data.details.underLut;

  // "Download PDF" opens this page with ?print=1: the browser's print dialog opens once, when the
  // invoice is on screen, and the button below covers a dialog that was closed.
  useEffect(() => {
    if (!ready || !wantsPrint || printed.current) return;
    printed.current = true;
    const frame = requestAnimationFrame(() => window.print());
    return () => cancelAnimationFrame(frame);
  }, [ready, wantsPrint]);

  return (
    <div className="relative z-10 min-h-screen bg-white text-[#111]">
      <style>{PRINT_STYLES}</style>
      <div
        style={TOOLBAR_TOKENS}
        className="print-hide mx-auto flex w-full max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4 py-3"
      >
        <Link
          href={`/invoices/${encodeURIComponent(invoiceId)}`}
          className="font-semibold text-[#1b3fa8] underline underline-offset-2"
        >
          <span aria-hidden="true">← </span>Back to the invoice
        </Link>
        <Button type="button" disabled={!ready} onClick={() => window.print()}>
          Print or save as PDF
        </Button>
      </div>
      {notUnderLut && (
        <p
          role="status"
          className="print-hide mx-auto mb-2 w-full max-w-[210mm] rounded border-2 border-[#8a4b00] bg-[#fff4e0] px-4 py-3 font-semibold text-[#5c3200]"
        >
          {NOT_UNDER_LUT_WARNING}
        </p>
      )}
      <main>
        {state.kind === "error" && (
          <LoadFailure title="Couldn't load this invoice" error={state.error} onRetry={reload} />
        )}
        {profileError && state.kind !== "error" && (
          <LoadFailure title="Couldn't load your profile" error={profileError} onRetry={retry} />
        )}
        {state.kind === "loading" && <p className="px-4 py-6">Getting the invoice ready…</p>}
        {state.kind === "ready" && profile && (
          <InvoiceDocument doc={buildPrintDocument(state.data, profile)} />
        )}
      </main>
    </div>
  );
}
