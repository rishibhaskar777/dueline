"use client";

import { useMemo, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { InvoiceSummary } from "@/types";
import { invoiceGridTheme } from "./ag-grid";
import { type GridContext, invoiceColumns } from "./invoice-columns";
import {
  countByStatus,
  filterByStatus,
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

export function InvoiceTable({ invoices, today, onOpen }: InvoiceTableProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const counts = useMemo(() => countByStatus(invoices), [invoices]);
  const context = useMemo<GridContext>(() => ({ today }), [today]);
  const rows = useMemo(() => sortForTable(filterByStatus(invoices, filter)), [invoices, filter]);

  return (
    <section aria-labelledby="invoices-title" className="rounded-xl border border-line bg-white">
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
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-56"
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
      <AgGridReact<InvoiceSummary>
        theme={invoiceGridTheme}
        rowData={rows}
        columnDefs={invoiceColumns}
        context={context}
        defaultColDef={defaultColDef}
        quickFilterText={search}
        getRowId={({ data }) => data.id}
        domLayout="autoHeight"
        onRowClicked={({ data }) => data && onOpen(data)}
        onCellKeyDown={({ event, data }) => {
          if (event instanceof KeyboardEvent && event.key === "Enter" && data) onOpen(data);
        }}
        overlayNoRowsTemplate="No invoices match."
      />
    </section>
  );
}
