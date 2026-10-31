import { basisNote } from "@/components/shared/risk-basis";
import type { ClientRisk } from "@/types";

// The reason is written by code from the numbers; the note says how few numbers there are.
export function RiskReason({ risk }: { risk: ClientRisk }) {
  const basis = basisNote(risk);
  return (
    <>
      {risk.reason}
      {basis && <span className="text-muted-foreground"> {basis}</span>}
    </>
  );
}
