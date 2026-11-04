"use client";

import { useState } from "react";
import { CustomisePanel } from "@/components/dashboard/CustomisePanel";
import { widgetSize } from "@/components/dashboard/dashboard-layout";
import { useDashboard } from "@/components/dashboard/use-dashboard";
import { useLayout } from "@/components/dashboard/use-layout";
import { LoadFailure } from "@/components/shared/LoadFailure";
import { UpdatingNote } from "@/components/shared/UpdatingNote";
import { cn } from "@/lib/utils";
import { HomeHeader } from "./HomeHeader";
import { InvoicePanel } from "./InvoicePanel";
import { ReceivablesSkeleton } from "./ReceivablesSkeleton";
import { EmptyReceivables, RefreshNote } from "./ReceivablesStates";
import { ReceivablesWidget } from "./ReceivablesWidget";
import { useReceivables } from "./use-receivables";

// Written out in full so Tailwind finds them.
const COLUMNS = {
  2: "lg:col-span-2",
  3: "lg:col-span-3",
  4: "lg:col-span-4",
  6: "lg:col-span-6",
} as const;
const ROWS = { 1: "", 2: "lg:row-span-2" } as const;

export function Receivables() {
  const { data, events, health, error, updating, freshEvents, retry } = useReceivables();
  const dashboard = useDashboard();
  const { layout, change, reset } = useLayout();
  const [openId, setOpenId] = useState<string | null>(null);
  const [customising, setCustomising] = useState(false);

  if (!data) {
    return (
      <div className="grid gap-5">
        <HomeHeader health={null} onCustomise={null} />
        {error ? (
          <LoadFailure title="Couldn't load your receivables" error={error} onRetry={retry} />
        ) : (
          <ReceivablesSkeleton />
        )}
      </div>
    );
  }

  const { invoices, today } = data;
  if (invoices.length === 0) {
    return (
      <div className="grid gap-5">
        <HomeHeader health={health} onCustomise={null} />
        <EmptyReceivables />
      </div>
    );
  }

  const open = invoices.find((invoice) => invoice.id === openId) ?? null;
  const shown = layout.filter(({ visible }) => visible);

  return (
    <div className="grid gap-5">
      <HomeHeader health={health} onCustomise={() => setCustomising(true)} />
      {error && <RefreshNote error={error} />}
      {!error && updating && <UpdatingNote />}
      {shown.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Every widget is hidden. Use Customise to show some again.
        </p>
      )}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-x-4 gap-y-5 [--surface-radius:24px] lg:grid-flow-dense lg:grid-cols-6">
        {shown.map(({ id }) => {
          const { columns, rows } = widgetSize(id);
          return (
            <div key={id} className={cn("grid min-w-0 empty:hidden", COLUMNS[columns], ROWS[rows])}>
              <ReceivablesWidget
                id={id}
                data={data}
                events={events}
                freshEvents={freshEvents}
                dashboard={dashboard}
                onOpen={(invoice) => setOpenId(invoice.id)}
                onSent={retry}
              />
            </div>
          );
        })}
      </div>
      <InvoicePanel invoice={open} today={today} onClose={() => setOpenId(null)} />
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
