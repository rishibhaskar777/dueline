import { Badge } from "@/components/ui/badge";
import type { RiskLevel } from "@/types";

const LABELS: Record<RiskLevel, string> = {
  new: "New",
  reliable: "Reliable",
  watch: "Watch",
  late_payer: "Late payer",
};

const STYLES: Record<RiskLevel, string> = {
  new: "bg-chip font-bold text-muted-foreground",
  reliable: "bg-tint-green font-bold text-paid",
  watch: "bg-tint-amber font-bold text-due-soon",
  late_payer: "bg-tint-red font-bold text-late",
};

// A client with no level yet has no history, so the badge says it is new.
export function RiskBadge({ level }: { level: RiskLevel | null }) {
  if (!level) return <Badge className="bg-chip font-bold text-muted-foreground">New</Badge>;
  return <Badge className={STYLES[level]}>{LABELS[level]}</Badge>;
}
