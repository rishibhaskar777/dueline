"use client";

import { useMemo, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import { gridTheme } from "@/components/grid/ag-grid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useIsPhone } from "@/components/shared/use-phone";
import type { InvoiceSummary } from "@/types";
import { InvoiceCards } from "./InvoiceCards";
import { type GridContext, invoiceColumns } from "./invoice-columns";
import {
  countByStatus,
  filterByStatus,
  searchInvoices,
  sortForTable,
  STATUS_FILTERS,
  type StatusFilter,
} from "./invoice-table-model";

interface InvoiceTableProps {
  invoices: InvoiceSummary[];
  today: string;
  onOpen: (invoice: InvoiceSummary) => void;
}

const defaultColDef = { sortable: true, resizable: true, suppressMovable: true };
// The columns share the width the page gives them, so none is pushed out of sight on a laptop.
const autoSizeStrategy = { type: "fitGridWidth" } as const;

export function InvoiceTable({ invoices, today, onOpen }: InvoiceTableProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const phone = useIsPhone();
  const counts = useMemo(() => countByStatus(invoices), [invoices]);
  const context = useMemo<GridContext>(() => ({ today }), [today]);
  const rows = useMemo(() => sortForTable(filterByStatus(invoices, filter)), [invoices, filter]);

  return (
    <section aria-labelledby="invoices-title" className="rounded-xl border border-line bg-card">
      <div className="flex flex-wrap items-end justify-between gap-3 p-6">
        <h2 id="invoices-title" className="text-xl font-semibold">
          Invoices
        </h2>
        <div className="grid gap-1.5">
          <Label htmlFor="invoice-search">Search invoices</Label>
          <Input
            id="invoice-search"
            type="search"
            autoComplete="off"
            placeholder="Client, invoice or work"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-56 max-md:w-full"
          />
        </div>
      </div>
      <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-2 px-6 pb-4">
        {STATUS_FILTERS.map(({ value, label }) => (
          <Button
            key={value}
            type="button"
            size="sm"
            variant={filter === value ? "default" : "outline"}
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
          >
            {label} ({counts[value]})
          </Button>
        ))}
      </div>
      {phone ? (
        <InvoiceCards invoices={searchInvoices(rows, search)} today={today} onOpen={onOpen} />
      ) : (
        <AgGridReact<InvoiceSummary>
          theme={gridTheme}
          rowData={rows}
          columnDefs={invoiceColumns}
          autoSizeStrategy={autoSizeStrategy}
          context={context}
          defaultColDef={defaultColDef}
          quickFilterText={search}
          includeHiddenColumnsInQuickFilter
          getRowId={({ data }) => data.id}
          domLayout="autoHeight"
          onRowClicked={({ data }) => data && onOpen(data)}
          onCellKeyDown={({ event, data }) => {
            if (!(event instanceof KeyboardEvent) || event.key !== "Enter" || !data) return;
            if (event.target instanceof Element && event.target.closest("a")) return;
            onOpen(data);
          }}
          overlayNoRowsTemplate="No invoices match."
        />
      )}
    </section>
  );
}
