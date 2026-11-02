import { reasonStripClasses } from "@/components/shared/risk-tone";
import { RiskReason } from "@/components/shared/RiskReason";
import { cn } from "@/lib/utils";
import type { ClientRisk, RiskLevel } from "@/types";

export function offerSentence({ suggestion }: Pick<ClientRisk, "suggestion">): string | null {
  return suggestion
    ? `Dueline suggests a ${suggestion.percent}% early-payment offer if paid within ${suggestion.withinDays} days.`
    : null;
}

interface ReasonStripProps {
  level: RiskLevel | null;
  risk: ClientRisk;
}

// Why the client is rated as they are, and the offer the app makes for them. A client with no
// level has no history to explain, so there is no strip.
export function ReasonStrip({ level, risk }: ReasonStripProps) {
  const tone = reasonStripClasses(level);
  if (!tone) return null;
  const offer = offerSentence(risk);
  return (
    <p className={cn("rounded-[20px] px-5 py-4 text-base font-semibold", tone)}>
      <RiskReason risk={risk} />
      {offer && ` ${offer}`}
    </p>
  );
}
