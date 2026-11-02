import { Badge } from "@/components/ui/badge";
import type { DueState, InvoiceSummary } from "@/types";
import { statusLabel } from "./invoice-status";

const STYLES: Record<DueState, string> = {
  paid: "bg-tint-green font-bold text-paid",
  on_time: "bg-tint-blue font-bold text-blue",
  due_soon: "bg-tint-amber font-bold text-due-soon",
  overdue: "bg-tint-red font-bold text-late",
};

export function StatusBadge({ invoice, today }: { invoice: InvoiceSummary; today: string }) {
  return <Badge className={STYLES[invoice.dueState]}>{statusLabel(invoice, today)}</Badge>;
}
