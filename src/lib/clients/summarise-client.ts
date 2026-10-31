import { reasonWithBasis } from "@/lib/risk/basis-note";
import type { ClientRisk, ClientSummary } from "@/types";
import type { ClientGroup } from "./group-clients";

const sumInr = (values: (number | null)[]): number =>
  values.reduce<number>((total, value) => total + (value ?? 0), 0);

export function summariseClient({ key, name, invoices, score }: ClientGroup): ClientSummary {
  const unpaid = invoices.filter(({ dueState }) => dueState !== "paid");
  const paidDates = invoices.flatMap(({ paidOn }) => (paidOn ? [paidOn] : []));
  return {
    key,
    name,
    riskLevel: score.invoicesConsidered > 0 ? score.level : null,
    riskReason: reasonWithBasis(score.reason, score.invoicesConsidered),
    invoices: invoices.length,
    billedInr: sumInr(invoices.map(({ payoutInr }) => payoutInr)),
    outstandingInr: sumInr(unpaid.map(({ payoutInr }) => payoutInr)),
    averageDaysLate: score.averageDaysLate,
    lastPaidOn: paidDates.sort().at(-1) ?? null,
  };
}

export function riskOf({ invoices, name, score }: ClientGroup): ClientRisk {
  return { clientEmail: invoices[0].client.email, clientName: name, ...score };
}
