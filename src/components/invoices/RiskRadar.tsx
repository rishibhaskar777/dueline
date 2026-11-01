"use client";

import { RiskBadge } from "@/components/shared/RiskBadge";
import { RiskReason } from "@/components/shared/RiskReason";
import { useClientRisk, type KnownRisk } from "@/components/shared/use-client-risk";
import { Button } from "@/components/ui/button";
import type { InvoiceForm } from "./invoice-form";
import { useDiscountOffer } from "./use-discount-offer";

interface RiskRadarProps {
  clientName: string;
  clientEmail: string;
  // What the server read for the client in the chat, so the first view needs no second request.
  known: KnownRisk;
  form: InvoiceForm;
  update: (changes: Partial<InvoiceForm>) => void;
}

export function RiskRadar({ clientName, clientEmail, known, form, update }: RiskRadarProps) {
  const risk = useClientRisk(clientEmail, clientName, known);
  const { applied, offer } = useDiscountOffer(form, risk?.suggestion ?? null, update);
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
      {suggestion &&
        (applied ? (
          <p role="status" className="mt-4 text-sm font-medium text-paid">
            Offered: {suggestion.percent}% if paid within {suggestion.withinDays} days. Change or
            remove it under Early-payment discount.
          </p>
        ) : (
          <Button type="button" variant="outline" className="mt-4" onClick={offer}>
            Offer {suggestion.percent}% if paid within {suggestion.withinDays} days
          </Button>
        ))}
    </section>
  );
}
