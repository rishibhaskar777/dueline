"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import { tableGridTheme } from "@/components/grid/ag-grid";
import { Segmented } from "@/components/shared/Segmented";
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
  const options = STATUS_FILTERS.map(({ value, label }) => ({
    value,
    label,
    count: counts[value],
    alert: value === "overdue",
  }));
  const context = useMemo<GridContext>(() => ({ today }), [today]);
  const rows = useMemo(() => sortForTable(filterByStatus(invoices, filter)), [invoices, filter]);

  return (
    <section
      aria-labelledby="invoices-title"
      className="surface flex flex-col gap-[18px] p-[26px] max-md:px-5 [--h2-size:26px] [--h2-tracking:-0.5px]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3.5">
        <h2 id="invoices-title">Invoices</h2>
        <div className="max-md:w-full max-md:[&>div]:flex max-md:[&>div]:w-full max-md:[&>div]:gap-0 max-md:[&_button]:flex-auto max-md:[&_button]:px-0.5 max-md:[&_button]:text-xs">
          <Segmented
            label="Filter by status"
            countNoun="invoice"
            options={options}
            value={filter}
            onChange={setFilter}
          />
        </div>
        <label className="flex h-11 min-w-[260px] items-center max-md:min-w-0 gap-2 rounded-full border border-search-edge bg-search px-4 max-md:w-full focus-within:ring-2 focus-within:ring-ring">
          <Search aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
          <span className="sr-only">Search invoices</span>
          <input
            type="search"
            autoComplete="off"
            placeholder="Client, invoice or work"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-[15px] font-medium text-foreground outline-none placeholder:text-subtle"
          />
        </label>
      </div>
      {phone ? (
        <InvoiceCards invoices={searchInvoices(rows, search)} today={today} onOpen={onOpen} />
      ) : (
        <div className="invoice-grid">
          <AgGridReact<InvoiceSummary>
            theme={tableGridTheme}
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
        </div>
      )}
    </section>
  );
}
