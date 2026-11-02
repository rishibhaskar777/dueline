import { Badge } from "@/components/ui/badge";
import type { DueState, InvoiceSummary } from "@/types";
import { clientStatusLabel, statusLabel, tableStatusLabel } from "./invoice-status";

const STYLES: Record<DueState, string> = {
  paid: "bg-tint-green font-bold text-paid",
  on_time: "bg-tint-blue font-bold text-blue",
  due_soon: "bg-tint-amber font-bold text-due-soon",
  overdue: "bg-tint-red font-bold text-late",
};

interface StatusBadgeProps {
  invoice: InvoiceSummary;
  today: string;
  // The table's wording, which adds the days an overdue invoice is late.
  detailed?: boolean;
  // The client page's wording, which also says how late a paid invoice was paid.
  lateness?: boolean;
}

export function StatusBadge({
  invoice,
  today,
  detailed = false,
  lateness = false,
}: StatusBadgeProps) {
  const label = lateness
    ? clientStatusLabel(invoice, today)
    : detailed
      ? tableStatusLabel(invoice, today)
      : statusLabel(invoice, today);
  return <Badge className={STYLES[invoice.dueState]}>{label}</Badge>;
}
