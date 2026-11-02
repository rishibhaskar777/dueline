import { Badge } from "@/components/ui/badge";
import type { RiskLevel } from "@/types";

const LABELS: Record<RiskLevel, string> = {
  reliable: "Reliable",
  watch: "Watch",
  late_payer: "Late payer",
};

const STYLES: Record<RiskLevel, string> = {
  reliable: "bg-tint-green font-bold text-paid",
  watch: "bg-tint-amber font-bold text-due-soon",
  late_payer: "bg-tint-red font-bold text-late",
};

export function RiskBadge({ level }: { level: RiskLevel }) {
  return <Badge className={STYLES[level]}>{LABELS[level]}</Badge>;
}
