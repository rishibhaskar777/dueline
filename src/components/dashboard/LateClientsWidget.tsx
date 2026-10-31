import { clientHref } from "@/components/clients/client-href";
import Link from "next/link";
import { RiskBadge } from "@/components/shared/RiskBadge";
import { formatRupees } from "@/lib/money/format";
import type { LateClient } from "@/types";
import { DashboardWidget } from "./DashboardWidget";
import type { DashboardState } from "./use-dashboard";

function List({ clients }: { clients: LateClient[] }) {
  return (
    <ul className="divide-y divide-line">
      {clients.map((client) => (
        <li key={client.key} className="py-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Link
              href={clientHref(client.key)}
              className="font-medium text-blue underline-offset-2 hover:underline"
            >
              {client.name}
            </Link>
            {client.riskLevel && <RiskBadge level={client.riskLevel} />}
            <span className="text-sm font-medium text-late tabular-nums">
              {client.daysLate} {client.daysLate === 1 ? "day" : "days"} late
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            About {formatRupees(client.overdueInr)} overdue. {client.reason}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function LateClientsWidget({
  state,
  onRetry,
}: {
  state: DashboardState;
  onRetry: () => void;
}) {
  return (
    <DashboardWidget
      id="late-clients"
      title="Clients behind on payment"
      state={state}
      onRetry={onRetry}
      emptyText="No client is late right now."
      isEmpty={({ lateClients }) => lateClients.length === 0}
    >
      {({ lateClients }) => <List clients={lateClients} />}
    </DashboardWidget>
  );
}
