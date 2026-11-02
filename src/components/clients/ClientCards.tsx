import Link from "next/link";
import { RiskBadge } from "@/components/shared/RiskBadge";
import { countryName } from "@/lib/countries";
import { formatDate } from "@/lib/format-date";
import { formatDays } from "@/lib/format-days";
import { formatRupees } from "@/lib/money/format";
import type { ClientSummary } from "@/types";
import { ClientAvatar } from "./ClientAvatar";
import { clientHref } from "./client-href";

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className="text-[17px] font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

// The line under the figures: why the client is rated as they are, or when they last paid.
export function cardNote(client: ClientSummary): string {
  const reason = client.riskReason.trim();
  if (reason) return reason;
  return client.lastPaidOn ? `Last paid ${formatDate(client.lastPaidOn)}.` : "";
}

export function ClientCards({ clients }: { clients: ClientSummary[] }) {
  return (
    <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {clients.map((client) => {
        const where = [
          countryName(client.country),
          `${client.invoices} ${client.invoices === 1 ? "invoice" : "invoices"}`,
        ]
          .filter(Boolean)
          .join(" · ");
        return (
          <li key={client.key} className="flex">
            <Link
              href={clientHref(client.key)}
              className="surface flex w-full flex-col gap-3.5 p-6 text-foreground no-underline outline-none transition-transform duration-[350ms] ease-spring [--surface-radius:24px] hover:-translate-y-[3px] focus-visible:ring-3 focus-visible:ring-ring motion-reduce:transition-none motion-reduce:hover:transform-none"
            >
              <span className="flex items-start justify-between gap-2.5">
                <span className="flex min-w-0 items-center gap-3">
                  <ClientAvatar name={client.name} level={client.riskLevel} size="md" />
                  <span className="min-w-0">
                    <span className="block font-heading text-xl font-extrabold break-words">
                      {client.name}
                    </span>
                    <span className="block text-sm text-muted-foreground">{where}</span>
                  </span>
                </span>
                <RiskBadge level={client.riskLevel} />
              </span>
              <dl className="grid grid-cols-3 gap-2 border-t border-line pt-3.5">
                <Figure label="Billed" value={formatRupees(client.billedInr)} />
                <Figure label="Owed" value={formatRupees(client.outstandingInr)} />
                <Figure
                  label="Pays in"
                  value={client.paySpeed ? formatDays(client.paySpeed.averageDays) : "–"}
                />
              </dl>
              <span className="text-sm text-subtle">{cardNote(client)}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
