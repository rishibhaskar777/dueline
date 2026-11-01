import { computePaySpeed } from "@/lib/insights/pay-speed";
import { reasonWithBasis } from "@/lib/risk/basis-note";
import type { ClientRisk, ClientSummary } from "@/types";
import type { ClientGroup } from "./group-clients";

const sumInr = (values: (number | null)[]): number =>
  values.reduce<number>((total, value) => total + (value ?? 0), 0);

export function summariseClient(
  { key, name, invoices, score }: ClientGroup,
  today: string,
): ClientSummary {
  const unpaid = invoices.filter(({ dueState }) => dueState !== "paid");
  // A merged client keeps its own email and country: only its own invoices speak for it.
  const own = invoices.some(({ mergedFrom }) => !mergedFrom)
    ? invoices.filter(({ mergedFrom }) => !mergedFrom)
    : invoices;
  const paidDates = invoices.flatMap(({ paidOn }) => (paidOn ? [paidOn] : []));
  return {
    key,
    name,
    email: own[0].client.email,
    country: own.find(({ client }) => client.country)?.client.country ?? null,
    paySpeed: computePaySpeed(invoices, today),
    riskLevel: score.invoicesConsidered > 0 ? score.level : null,
    riskReason: reasonWithBasis(
      score.reason,
      score.invoicesConsidered,
      invoices.some(({ mergedFrom }) => mergedFrom),
    ),
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
