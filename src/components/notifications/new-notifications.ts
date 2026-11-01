import { describeTriggered } from "@/lib/automation/rate-alerts";
import { formatMoney } from "@/lib/money/format";
import type { ActivityEvent, TriggeredRateAlert } from "@/types";

export interface Seen {
  alerts: string[];
  events: string[];
}

export interface BrowserMessage {
  id: string;
  title: string;
  body: string;
}

function alertId(alert: TriggeredRateAlert): string {
  return `${alert.currency}:${alert.direction}:${alert.threshold}`;
}

function paidMessage(event: ActivityEvent): BrowserMessage {
  const amount = event.amount ? ` ${formatMoney(event.amount)}` : "";
  return {
    id: event.id,
    title: "Payment received",
    body: `${event.clientName} paid ${event.invoiceNumber}.${amount}`.trim(),
  };
}

// The first reading only records what is already there, so opening the app does not announce old
// news. After that, an alert that has just been triggered or a payment that has just arrived is new.
export function findNewMessages(
  seen: Seen | null,
  alerts: TriggeredRateAlert[],
  events: ActivityEvent[],
): { seen: Seen; messages: BrowserMessage[] } {
  const paid = events.filter(({ kind }) => kind === "paid");
  const next: Seen = { alerts: alerts.map(alertId), events: paid.map(({ id }) => id) };
  if (seen === null) return { seen: next, messages: [] };

  const messages: BrowserMessage[] = [
    ...alerts
      .filter((alert) => !seen.alerts.includes(alertId(alert)))
      .map((alert) => ({
        id: alertId(alert),
        title: "Rate alert",
        body: describeTriggered(alert),
      })),
    ...paid.filter(({ id }) => !seen.events.includes(id)).map(paidMessage),
  ];
  return { seen: next, messages };
}
