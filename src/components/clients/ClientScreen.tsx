"use client";

import Link from "next/link";
import { useCallback } from "react";
import { InvoiceList } from "@/components/clients/InvoiceList";
import { LoadFailure } from "@/components/shared/LoadFailure";
import { RiskBadge } from "@/components/shared/RiskBadge";
import { SkeletonBlock } from "@/components/shared/SkeletonBlock";
import { StatTile } from "@/components/shared/StatTile";
import { useLoad } from "@/components/shared/use-load";
import { useToday } from "@/components/shared/use-today";
import { buttonVariants } from "@/components/ui/button";
import { getClientDetail } from "@/lib/api-client";
import { formatRupees } from "@/lib/money/format";
import { ClientNotes } from "./ClientNotes";

function NotFound() {
  return (
    <div className="max-w-xl rounded-xl border border-line bg-white p-6">
      <h1 className="text-xl font-semibold">We couldn&apos;t find that client</h1>
      <p className="mt-2 text-sm">
        They may have no invoices left, or the address may be wrong.{" "}
        <Link href="/clients" className="text-blue underline underline-offset-2">
          See all clients
        </Link>
      </p>
    </div>
  );
}

export function ClientScreen({ clientKey }: { clientKey: string }) {
  const load = useCallback(() => getClientDetail(clientKey), [clientKey]);
  const { state, reload } = useLoad(load);
  const today = useToday();

  if (state.kind === "loading") return <SkeletonBlock className="h-96" />;
  if (state.kind === "error") {
    return state.error.notFound ? (
      <NotFound />
    ) : (
      <LoadFailure title="Couldn't load this client" error={state.error} onRetry={reload} />
    );
  }

  const { client, invoices, notes } = state.data;
  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm">
            <Link href="/clients" className="text-blue underline underline-offset-2">
              All clients
            </Link>
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold">{client.name}</h1>
            {client.riskLevel && <RiskBadge level={client.riskLevel} />}
          </div>
          <p className="mt-2 max-w-2xl text-muted-foreground">{client.riskReason}</p>
        </div>
        <Link
          href={`/invoices/new?client=${encodeURIComponent(client.name)}`}
          className={buttonVariants({ size: "lg" })}
        >
          New invoice for this client
        </Link>
      </header>
      <dl aria-label="Client totals" className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label="Billed"
          value={formatRupees(client.billedInr)}
          note="Across all invoices"
        />
        <StatTile
          label="Outstanding"
          value={formatRupees(client.outstandingInr)}
          note="Estimated after fees"
        />
        <StatTile
          label="Average days late"
          value={client.averageDaysLate > 0 ? String(client.averageDaysLate) : "–"}
          note="On invoices paid late or overdue"
        />
      </dl>
      <InvoiceList invoices={invoices} today={today} />
      <ClientNotes clientKey={client.key} initial={notes} />
    </div>
  );
}
