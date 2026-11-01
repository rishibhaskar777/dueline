"use client";

import { RiskBadge } from "@/components/shared/RiskBadge";
import { RiskReason } from "@/components/shared/RiskReason";
import { useClientRisk, type KnownRisk } from "@/components/shared/use-client-risk";
import { Button } from "@/components/ui/button";
import type { ClientRisk } from "@/types";

interface RiskRadarProps {
  clientName: string;
  clientEmail: string;
  // What the server read for the client in the chat, so the first view needs no second request.
  known: KnownRisk;
  onOffer: (suggestion: NonNullable<ClientRisk["suggestion"]>) => void;
}

export function RiskRadar({ clientName, clientEmail, known, onOffer }: RiskRadarProps) {
  const risk = useClientRisk(clientEmail, clientName, known);
  if (!risk || risk.invoicesConsidered === 0) return null;

  if (risk.level === "reliable") {
    return (
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-paid">Reliable payer.</span> <RiskReason risk={risk} />
      </p>
    );
  }

  const { suggestion } = risk;
  return (
    <section aria-labelledby="radar-title" className="rounded-xl border border-line bg-card p-6">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="radar-title" className="text-xl font-semibold">
          Late-payer radar
        </h2>
        <RiskBadge level={risk.level} />
      </div>
      <p className="mt-2 text-sm">
        <RiskReason risk={risk} />
      </p>
      {suggestion && (
        <Button
          type="button"
          variant="outline"
          className="mt-4"
          onClick={() => onOffer(suggestion)}
        >
          Offer {suggestion.percent}% if paid within {suggestion.withinDays} days
        </Button>
      )}
    </section>
  );
}
