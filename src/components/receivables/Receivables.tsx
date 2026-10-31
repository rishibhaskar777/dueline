"use client";

import { useState } from "react";
import { LoadFailure } from "@/components/shared/LoadFailure";
import { formatDate } from "@/lib/format-date";
import { ActivityFeed } from "./ActivityFeed";
import { DueLineChart } from "./DueLineChart";
import { InvoicePanel } from "./InvoicePanel";
import { InvoiceTable } from "./InvoiceTable";
import { ReceivablesSkeleton } from "./ReceivablesSkeleton";
import { EmptyReceivables, RefreshNote } from "./ReceivablesStates";
import { TotalsStrip } from "./TotalsStrip";
import { useReceivables } from "./use-receivables";

export function Receivables() {
  const { data, error, freshEvents, retry } = useReceivables();
  const [openId, setOpenId] = useState<string | null>(null);

  if (!data) {
    return error ? (
      <LoadFailure title="Couldn't load your receivables" error={error} onRetry={retry} />
    ) : (
      <ReceivablesSkeleton />
    );
  }
  if (data.invoices.length === 0) return <EmptyReceivables />;

  const { invoices, totals, events, health } = data;
  const open = invoices.find((invoice) => invoice.id === openId) ?? null;

  return (
    <div className="grid gap-6">
      {(health.demoClock || error) && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
          {health.demoClock && (
            <p className="text-sm text-muted-foreground">Demo date: {formatDate(health.today)}</p>
          )}
          {error && <RefreshNote error={error} />}
        </div>
      )}
      <TotalsStrip totals={totals} />
      <DueLineChart
        invoices={invoices}
        today={health.today}
        onOpen={(invoice) => setOpenId(invoice.id)}
      />
      <div className="grid items-start gap-6 2xl:grid-cols-[minmax(0,1fr)_20rem]">
        <InvoiceTable
          invoices={invoices}
          today={health.today}
          onOpen={(invoice) => setOpenId(invoice.id)}
        />
        <ActivityFeed events={events} today={health.today} freshEvents={freshEvents} />
      </div>
      <InvoicePanel invoice={open} today={health.today} onClose={() => setOpenId(null)} />
    </div>
  );
}
