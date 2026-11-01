"use client";

import { clientHref } from "@/components/clients/client-href";
import { AgGridReact } from "ag-grid-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { gridTheme } from "@/components/grid/ag-grid";
import { LoadFailure } from "@/components/shared/LoadFailure";
import { SkeletonBlock } from "@/components/shared/SkeletonBlock";
import { useLoad } from "@/components/shared/use-load";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useIsPhone } from "@/components/shared/use-phone";
import { getClients } from "@/lib/api-client";
import type { ClientSummary } from "@/types";
import { ClientCards } from "./ClientCards";
import { clientColumns } from "./client-columns";
import { searchClients } from "./client-search";

const defaultColDef = { sortable: true, resizable: true, suppressMovable: true };

export function ClientsScreen() {
  const { state, reload } = useLoad(getClients);
  const router = useRouter();
  const [search, setSearch] = useState("");
  const phone = useIsPhone();

  if (state.kind === "loading") {
    return <SkeletonBlock className="h-80" />;
  }
  if (state.kind === "error") {
    return <LoadFailure title="Couldn't load your clients" error={state.error} onRetry={reload} />;
  }
  if (state.data.length === 0) {
    return (
      <p className="max-w-xl rounded-xl border border-line bg-card p-6 text-sm">
        Your clients appear here once you have sent an invoice.
      </p>
    );
  }

  const open = (client: ClientSummary) => router.push(clientHref(client.key));

  return (
    <section aria-labelledby="clients-title" className="rounded-xl border border-line bg-card">
      <div className="flex flex-wrap items-end justify-between gap-3 p-6">
        <h2 id="clients-title" className="text-xl font-semibold">
          Clients
        </h2>
        <div className="grid gap-1.5">
          <Label htmlFor="client-search">Search clients</Label>
          <Input
            id="client-search"
            type="search"
            autoComplete="off"
            placeholder="Client name"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-56 max-md:w-full"
          />
        </div>
      </div>
      {phone ? (
        <ClientCards clients={searchClients(state.data, search)} />
      ) : (
        <AgGridReact<ClientSummary>
          theme={gridTheme}
          rowData={state.data}
          columnDefs={clientColumns}
          defaultColDef={defaultColDef}
          quickFilterText={search}
          includeHiddenColumnsInQuickFilter
          getRowId={({ data }) => data.key}
          domLayout="autoHeight"
          onRowClicked={({ data }) => data && open(data)}
          onCellKeyDown={({ event, data }) => {
            if (event instanceof KeyboardEvent && event.key === "Enter" && data) open(data);
          }}
          overlayNoRowsTemplate="No clients match."
        />
      )}
    </section>
  );
}
