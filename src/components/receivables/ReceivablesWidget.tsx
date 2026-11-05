import type { WidgetId } from "@/components/dashboard/dashboard-layout";
import { ChecklistWidget } from "@/components/dashboard/ChecklistWidget";
import { FeesLostWidget } from "@/components/dashboard/FeesLostWidget";
import { ForecastWidget } from "@/components/dashboard/ForecastWidget";
import { LateClientsWidget } from "@/components/dashboard/LateClientsWidget";
import { MorningWidget } from "@/components/dashboard/MorningWidget";
import { RatesWidget } from "@/components/dashboard/RatesWidget";
import { TourWidget } from "@/components/dashboard/TourWidget";
import { UpcomingDueWidget } from "@/components/dashboard/UpcomingDueWidget";
import type { useDashboard } from "@/components/dashboard/use-dashboard";
import type { InvoiceSummary } from "@/types";
import { ActivityFeed } from "./ActivityFeed";
import { DueLineChart } from "./DueLineChart";
import { InvoiceTable } from "./InvoiceTable";
import { ReadyToSendCard } from "./ReadyToSendCard";
import type { Receivables } from "./use-receivables";
import { TotalsStrip } from "./TotalsStrip";

interface ReceivablesWidgetProps {
  id: WidgetId;
  data: NonNullable<Receivables["data"]>;
  events: Receivables["events"];
  freshEvents: Receivables["freshEvents"];
  dashboard: ReturnType<typeof useDashboard>;
  onOpen: (invoice: InvoiceSummary) => void;
  onSent: () => void;
}

export function ReceivablesWidget({
  id,
  data,
  events,
  freshEvents,
  dashboard,
  onOpen,
  onSent,
}: ReceivablesWidgetProps) {
  const { invoices, totals, today } = data;
  const { state, retry } = dashboard;

  switch (id) {
    case "tour":
      return (
        <TourWidget
          today={today}
          invoices={invoices}
          hasReadyToSend={data.readyToSend.length > 0}
        />
      );
    case "readyToSend":
      return <ReadyToSendCard invoices={data.readyToSend} onSent={onSent} />;
    case "checklist":
      return <ChecklistWidget />;
    case "morning":
      return <MorningWidget />;
    case "totals":
      return <TotalsStrip totals={totals} invoices={invoices} />;
    case "forecast":
      return <ForecastWidget state={state} onRetry={retry} />;
    case "dueLine":
      return <DueLineChart invoices={invoices} today={today} onOpen={onOpen} />;
    case "upcomingDue":
      return <UpcomingDueWidget state={state} onRetry={retry} />;
    case "lateClients":
      return <LateClientsWidget state={state} onRetry={retry} />;
    case "feesLost":
      return <FeesLostWidget state={state} onRetry={retry} invoices={invoices} />;
    case "rates":
      return <RatesWidget state={state} onRetry={retry} />;
    case "invoices":
      return <InvoiceTable invoices={invoices} today={today} onOpen={onOpen} />;
    case "activity":
      return <ActivityFeed events={events} today={today} freshEvents={freshEvents} />;
  }
}
