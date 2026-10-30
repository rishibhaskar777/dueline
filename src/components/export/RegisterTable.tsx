"use client";

import { AgGridReact } from "ag-grid-react";
import { gridTheme } from "@/components/grid/ag-grid";
import type { ExportRegisterRow } from "@/types";
import { registerColumns } from "./register-columns";

const defaultColDef = { sortable: true, resizable: true, suppressMovable: true };

export function RegisterTable({ rows }: { rows: ExportRegisterRow[] }) {
  return (
    <section aria-labelledby="register-title" className="rounded-xl border border-line bg-white">
      <h2 id="register-title" className="p-6 text-xl font-semibold">
        Paid invoices
      </h2>
      <AgGridReact<ExportRegisterRow>
        theme={gridTheme}
        rowData={rows}
        columnDefs={registerColumns}
        defaultColDef={defaultColDef}
        getRowId={({ data }) => data.invoiceId}
        domLayout="autoHeight"
        tooltipShowDelay={300}
      />
    </section>
  );
}
