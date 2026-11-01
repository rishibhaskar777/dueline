"use client";

import Link from "next/link";
import { useCallback } from "react";
import { InvoiceActions } from "@/components/invoice-page/InvoiceActions";
import { InvoiceDetailsCard } from "@/components/invoice-page/InvoiceDetailsCard";
import { InvoiceFacts } from "@/components/invoice-page/InvoiceFacts";
import { InvoiceHeader } from "@/components/invoice-page/InvoiceHeader";
import { Timeline } from "@/components/invoice-page/Timeline";
import { LoadFailure } from "@/components/shared/LoadFailure";
import { SkeletonBlock } from "@/components/shared/SkeletonBlock";
import { useLoad } from "@/components/shared/use-load";
import { useToday } from "@/components/shared/use-today";
import { getInvoiceDetail } from "@/lib/api-client";

function NotFound() {
  return (
    <div className="max-w-xl rounded-xl border border-line bg-card p-6">
      <h1 className="text-xl font-semibold">We couldn&apos;t find that invoice</h1>
      <p className="mt-2 text-sm">
        <Link href="/receivables" className="text-blue underline underline-offset-2">
          Back to Receivables
        </Link>
      </p>
    </div>
  );
}

export function InvoiceScreen({ invoiceId }: { invoiceId: string }) {
  const load = useCallback(() => getInvoiceDetail(invoiceId), [invoiceId]);
  const { state, reload } = useLoad(load);
  const today = useToday();

  if (state.kind === "loading") return <SkeletonBlock className="h-96" />;
  if (state.kind === "error") {
    return state.error.notFound ? (
      <NotFound />
    ) : (
      <LoadFailure title="Couldn't load this invoice" error={state.error} onRetry={reload} />
    );
  }

  const { invoice, details, timeline } = state.data;
  return (
    <div className="grid gap-6">
      <InvoiceHeader invoice={invoice} clientKey={details.clientKey} today={today} />
      <InvoiceFacts invoice={invoice} details={details} today={today} />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid gap-6">
          <InvoiceDetailsCard details={details} />
          <InvoiceActions invoice={invoice} details={details} today={today} onChanged={reload} />
        </div>
        <Timeline events={timeline} />
      </div>
    </div>
  );
}
