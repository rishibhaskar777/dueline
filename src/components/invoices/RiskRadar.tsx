"use client";

import { RiskBadge } from "@/components/shared/RiskBadge";
import { RiskReason } from "@/components/shared/RiskReason";
import { useClientRisk, type KnownRisk } from "@/components/shared/use-client-risk";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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

  if (risk.level === "reliable" || risk.level === "new") {
    const reliable = risk.level === "reliable";
    return (
      <p className="text-sm text-muted-foreground">
        <span className={reliable ? "font-medium text-paid" : "font-medium text-blue"}>
          {reliable ? "Reliable payer." : "New client."}
        </span>{" "}
        <RiskReason risk={risk} />
      </p>
    );
  }

  const { suggestion } = risk;
  const late = risk.level === "late_payer";
  return (
    <section
      aria-labelledby="radar-title"
      className={cn(
        "flex flex-wrap items-center justify-between gap-3.5 rounded-[24px] px-[26px] py-[22px]",
        late ? "bg-tint-red" : "bg-tint-amber",
      )}
    >
      <div className="grid min-w-0 gap-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2
            id="radar-title"
            className={cn(
              "font-heading text-[22px] font-extrabold",
              late ? "text-late" : "text-due-soon",
            )}
          >
            Late-payer radar
          </h2>
          <span className="rounded-full bg-card">
            <RiskBadge level={risk.level} />
          </span>
        </div>
        <p className="text-[15px]">
          <RiskReason risk={risk} />
        </p>
      </div>
      {suggestion &&
        (applied ? (
          <p role="status" className="max-w-md text-sm font-semibold text-paid">
            Offered: {suggestion.percent}% if paid within {suggestion.withinDays} days. Change or
            remove it under Early-payment discount.
          </p>
        ) : (
          <Button type="button" className="h-11 px-5 font-bold" onClick={offer}>
            Offer {suggestion.percent}% if paid within {suggestion.withinDays} days
          </Button>
        ))}
    </section>
  );
}
