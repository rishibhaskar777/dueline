import { daysBetween } from "@/lib/date-math";
import type { ClientGroup } from "@/lib/clients/group-clients";
import { reasonWithBasis } from "@/lib/risk/basis-note";
import type { InvoiceSummary, LateClient, UpcomingDue } from "@/types";

const UPCOMING_DAYS = 14;
const LATE_CLIENTS_SHOWN = 3;

// Unpaid invoices whose due date falls from today to two weeks ahead, soonest first. Overdue ones
// are not "upcoming"; the late clients list covers them.
export function upcomingDue(invoices: InvoiceSummary[], today: string): UpcomingDue[] {
  return invoices
    .filter(({ dueState, dueOn }) => {
      if (dueState === "paid" || dueState === "overdue") return false;
      return daysBetween(today, dueOn) <= UPCOMING_DAYS;
    })
    .sort((a, b) => a.dueOn.localeCompare(b.dueOn) || a.number.localeCompare(b.number))
    .map((invoice) => ({
      invoiceId: invoice.id,
      invoiceNumber: invoice.number,
      clientName: invoice.client.name,
      amount: invoice.amount,
      dueOn: invoice.dueOn,
      payoutInr: invoice.payoutInr,
    }));
}

// The three clients furthest behind, judged by their most overdue unpaid invoice.
export function lateClients(groups: ClientGroup[]): LateClient[] {
  return groups
    .flatMap((group) => {
      const overdue = group.invoices.filter(({ dueState }) => dueState === "overdue");
      if (overdue.length === 0) return [];
      return [
        {
          key: group.key,
          name: group.name,
          daysLate: Math.max(...overdue.map(({ daysLate }) => daysLate)),
          overdueInr: overdue.reduce((sum, { payoutInr }) => sum + (payoutInr ?? 0), 0),
          riskLevel: group.score.invoicesConsidered > 0 ? group.score.level : null,
          reason: reasonWithBasis(
            group.score.reason,
            group.score.invoicesConsidered,
            group.invoices.some(({ mergedFrom }) => mergedFrom),
          ),
        },
      ];
    })
    .sort((a, b) => b.daysLate - a.daysLate || a.name.localeCompare(b.name))
    .slice(0, LATE_CLIENTS_SHOWN);
}
