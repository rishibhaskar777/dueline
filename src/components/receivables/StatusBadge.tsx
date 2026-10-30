import { Badge } from "@/components/ui/badge";
import type { DueState, InvoiceSummary } from "@/types";
import { statusLabel } from "./invoice-status";

const STYLES: Record<DueState, string> = {
  paid: "bg-paid/10 text-paid",
  on_time: "bg-blue/10 text-blue",
  due_soon: "bg-due-soon/10 text-due-soon",
  overdue: "bg-late/10 text-late",
};

export function StatusBadge({ invoice, today }: { invoice: InvoiceSummary; today: string }) {
  return <Badge className={STYLES[invoice.dueState]}>{statusLabel(invoice, today)}</Badge>;
}
