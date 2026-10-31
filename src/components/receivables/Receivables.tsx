"use client";

import { useState } from "react";
import { CustomisePanel } from "@/components/dashboard/CustomisePanel";
import { isWide } from "@/components/dashboard/dashboard-layout";
import { useDashboard } from "@/components/dashboard/use-dashboard";
import { useLayout } from "@/components/dashboard/use-layout";
import { LoadFailure } from "@/components/shared/LoadFailure";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format-date";
import { cn } from "@/lib/utils";
import { InvoicePanel } from "./InvoicePanel";
import { ReceivablesSkeleton } from "./ReceivablesSkeleton";
import { EmptyReceivables, RefreshNote } from "./ReceivablesStates";
import { ReceivablesWidget } from "./ReceivablesWidget";
import { useReceivables } from "./use-receivables";

export function Receivables() {
  const { data, error, freshEvents, retry } = useReceivables();
  const dashboard = useDashboard();
  const { layout, change, reset } = useLayout();
  const [openId, setOpenId] = useState<string | null>(null);
  const [customising, setCustomising] = useState(false);

  if (!data) {
    return error ? (
      <LoadFailure title="Couldn't load your receivables" error={error} onRetry={retry} />
    ) : (
      <ReceivablesSkeleton />
    );
  }
  if (data.invoices.length === 0) return <EmptyReceivables />;

  const { invoices, health } = data;
  const open = invoices.find((invoice) => invoice.id === openId) ?? null;
  const shown = layout.filter(({ visible }) => visible);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
          {health.demoClock && (
            <p className="text-sm text-muted-foreground">Demo date: {formatDate(health.today)}</p>
          )}
          {error && <RefreshNote error={error} />}
        </div>
        <Button type="button" variant="outline" onClick={() => setCustomising(true)}>
          Customise
        </Button>
      </div>
      {shown.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Every widget is hidden. Use Customise to show some again.
        </p>
      )}
      <div className="grid items-start gap-6 lg:grid-cols-2">
        {shown.map(({ id }) => (
          <div key={id} className={cn("min-w-0", isWide(id) && "lg:col-span-2")}>
            <ReceivablesWidget
              id={id}
              data={data}
              freshEvents={freshEvents}
              dashboard={dashboard}
              onOpen={(invoice) => setOpenId(invoice.id)}
            />
          </div>
        ))}
      </div>
      <InvoicePanel invoice={open} today={health.today} onClose={() => setOpenId(null)} />
      <CustomisePanel
        open={customising}
        onOpenChange={setCustomising}
        layout={layout}
        onChange={change}
        onReset={reset}
      />
    </div>
  );
}
