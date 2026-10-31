"use client";

import { Download } from "lucide-react";
import { useEffect, useState } from "react";
import { LoadFailure } from "@/components/shared/LoadFailure";
import { SkeletonBlock } from "@/components/shared/SkeletonBlock";
import { toLoadError, type LoadError } from "@/components/shared/load-error";
import { FactRow } from "@/components/shared/FactRow";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { financialYearRange } from "@/lib/date-math";
import { annualSummaryCsvUrl, getAnnualSummary } from "@/lib/api-client";
import { ESTIMATE_LABEL, OVER_LIMIT_WARNING } from "@/lib/export/tax-notes";
import { formatDate } from "@/lib/format-date";
import { formatRupees } from "@/lib/money/format";
import type { AnnualSummary } from "@/types";

type SummaryState =
  | { kind: "loading" }
  | { kind: "error"; error: LoadError }
  | { kind: "ready"; summary: AnnualSummary };

function SummaryBody({ fy }: { fy: string }) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<SummaryState>({ kind: "loading" });

  useEffect(() => {
    let active = true;
    getAnnualSummary(fy).then(
      (summary) => active && setState({ kind: "ready", summary }),
      (error) => active && setState({ kind: "error", error: toLoadError(error) }),
    );
    return () => {
      active = false;
    };
  }, [fy, attempt]);

  if (state.kind === "loading") return <SkeletonBlock className="h-64" />;
  if (state.kind === "error") {
    return (
      <LoadFailure
        title="Couldn't load the year summary"
        error={state.error}
        onRetry={() => {
          setState({ kind: "loading" });
          setAttempt((n) => n + 1);
        }}
      />
    );
  }

  const { summary } = state;
  return (
    <>
      <dl className="divide-y divide-line">
        <FactRow label="Received through PayPal" value={formatRupees(summary.receivedPayPalInr)} />
        <FactRow label="Recorded outside PayPal" value={formatRupees(summary.receivedOutsideInr)} />
        <FactRow label="PayPal fees" value={formatRupees(summary.paypalFeesInr)} />
        <FactRow label="Conversion loss" value={formatRupees(summary.conversionLossInr)} />
        <FactRow label="Gross receipts" value={formatRupees(summary.grossReceiptsInr)} />
        <FactRow
          label="Section 44ADA income (50%)"
          value={formatRupees(summary.presumptiveIncomeInr)}
        />
        <FactRow label="Section 44ADA limit" value={formatRupees(summary.presumptiveLimitInr)} />
        <FactRow
          label="Invoices and clients"
          value={`${summary.invoiceCount} invoices, ${summary.clientCount} clients`}
        />
      </dl>
      {summary.overLimit && (
        <p role="alert" className="rounded-lg border border-late p-3 text-late">
          {OVER_LIMIT_WARNING}
        </p>
      )}
      <a href={annualSummaryCsvUrl(fy)} className={buttonVariants({ size: "lg" })}>
        <Download aria-hidden="true" />
        Download CSV
      </a>
    </>
  );
}

export function AnnualSummaryDialog({ fy }: { fy: string }) {
  const { from, to } = financialYearRange(fy);
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" size="lg" />}>Year summary</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Year summary, {fy}</DialogTitle>
          <DialogDescription>
            {formatDate(from)} to {formatDate(to)}. {ESTIMATE_LABEL}
          </DialogDescription>
        </DialogHeader>
        <SummaryBody fy={fy} />
      </DialogContent>
    </Dialog>
  );
}
