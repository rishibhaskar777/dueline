"use client";

import { AgGridReact } from "ag-grid-react";
import { gridTheme } from "@/components/grid/ag-grid";
import { useIsPhone } from "@/components/shared/use-phone";
import type { ExportRegisterRow } from "@/types";
import { RegisterCards } from "./RegisterCards";
import { registerColumns } from "./register-columns";

const defaultColDef = { sortable: true, resizable: true, suppressMovable: true };

export function RegisterTable({ rows }: { rows: ExportRegisterRow[] }) {
  const phone = useIsPhone();
  return (
    <section aria-labelledby="register-title" className="rounded-xl border border-line bg-card">
      <h2 id="register-title" className="p-6 text-xl font-semibold">
        Paid invoices
      </h2>
      {phone ? (
        <RegisterCards rows={rows} />
      ) : (
        <AgGridReact<ExportRegisterRow>
          theme={gridTheme}
          rowData={rows}
          columnDefs={registerColumns}
          defaultColDef={defaultColDef}
          getRowId={({ data }) => data.invoiceId}
          domLayout="autoHeight"
          tooltipShowDelay={300}
        />
      )}
    </section>
  );
}
