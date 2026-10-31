import { Badge } from "@/components/ui/badge";
import type { RiskLevel } from "@/types";

const LABELS: Record<RiskLevel, string> = {
  reliable: "Reliable",
  watch: "Watch",
  late_payer: "Late payer",
};

const STYLES: Record<RiskLevel, string> = {
  reliable: "bg-paid/10 text-paid",
  watch: "bg-due-soon/10 text-due-soon",
  late_payer: "bg-late/10 text-late",
};

export function RiskBadge({ level }: { level: RiskLevel }) {
  return <Badge className={STYLES[level]}>{LABELS[level]}</Badge>;
}
