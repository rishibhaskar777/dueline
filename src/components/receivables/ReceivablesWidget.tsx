import type { WidgetId } from "@/components/dashboard/dashboard-layout";
import { FeesLostWidget } from "@/components/dashboard/FeesLostWidget";
import { ForecastWidget } from "@/components/dashboard/ForecastWidget";
import { LateClientsWidget } from "@/components/dashboard/LateClientsWidget";
import { MorningWidget } from "@/components/dashboard/MorningWidget";
import { RatesWidget } from "@/components/dashboard/RatesWidget";
import { UpcomingDueWidget } from "@/components/dashboard/UpcomingDueWidget";
import type { useDashboard } from "@/components/dashboard/use-dashboard";
import type { InvoiceSummary } from "@/types";
import { ActivityFeed } from "./ActivityFeed";
import { DueLineChart } from "./DueLineChart";
import { InvoiceTable } from "./InvoiceTable";
import type { Receivables } from "./use-receivables";
import { TotalsStrip } from "./TotalsStrip";

interface ReceivablesWidgetProps {
  id: WidgetId;
  data: NonNullable<Receivables["data"]>;
  freshEvents: Receivables["freshEvents"];
  dashboard: ReturnType<typeof useDashboard>;
  onOpen: (invoice: InvoiceSummary) => void;
}

export function ReceivablesWidget({
  id,
  data,
  freshEvents,
  dashboard,
  onOpen,
}: ReceivablesWidgetProps) {
  const { invoices, totals, events, health } = data;
  const { state, retry } = dashboard;

  switch (id) {
    case "morning":
      return <MorningWidget />;
    case "totals":
      return <TotalsStrip totals={totals} />;
    case "forecast":
      return <ForecastWidget state={state} onRetry={retry} />;
    case "dueLine":
      return <DueLineChart invoices={invoices} today={health.today} onOpen={onOpen} />;
    case "upcomingDue":
      return <UpcomingDueWidget state={state} onRetry={retry} />;
    case "lateClients":
      return <LateClientsWidget state={state} onRetry={retry} />;
    case "feesLost":
      return <FeesLostWidget state={state} onRetry={retry} />;
    case "rates":
      return <RatesWidget state={state} onRetry={retry} />;
    case "invoices":
      return <InvoiceTable invoices={invoices} today={health.today} onOpen={onOpen} />;
    case "activity":
      return <ActivityFeed events={events} today={health.today} freshEvents={freshEvents} />;
  }
}
