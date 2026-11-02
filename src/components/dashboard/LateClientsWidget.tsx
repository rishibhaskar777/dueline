import { clientHref } from "@/components/clients/client-href";
import Link from "next/link";
import { formatRupees } from "@/lib/money/format";
import type { LateClient } from "@/types";
import { DashboardWidget } from "./DashboardWidget";
import { lateHistoryLine, latePill } from "./late-client-pill";
import type { DashboardState } from "./use-dashboard";

function List({ clients }: { clients: LateClient[] }) {
  return (
    <ul className="grid gap-3.5">
      {clients.map((client) => {
        const pill = latePill(client);
        return (
          <li key={client.key}>
            <Link
              href={clientHref(client.key)}
              className="-mx-2 flex items-center justify-between gap-2.5 rounded-lg px-2 py-0.5 text-foreground no-underline outline-none hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span>
                <span className="block font-bold">{client.name}</span>
                <span className="block text-sm font-medium text-foreground tabular-nums">
                  {lateHistoryLine(client)}
                </span>
                <span className="text-sm text-muted-foreground">
                  About {formatRupees(client.overdueInr)} overdue. {client.reason}
                </span>
              </span>
              {pill && (
                <span className="rounded-full bg-tint-red px-3 py-1.5 text-[13px] font-bold whitespace-nowrap text-late tabular-nums">
                  {pill}
                </span>
              )}
            </Link>
          </li>
        );
      })}
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
      title="Clients behind"
      state={state}
      onRetry={onRetry}
      emptyText="No client is late right now."
      isEmpty={({ lateClients }) => lateClients.length === 0}
    >
      {({ lateClients }) => <List clients={lateClients} />}
    </DashboardWidget>
  );
}
