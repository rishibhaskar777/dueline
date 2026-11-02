"use client";

import { AgGridReact } from "ag-grid-react";
import { tableGridTheme } from "@/components/grid/ag-grid";
import { useMediaQuery } from "@/components/shared/use-media-query";
import { useIsPhone } from "@/components/shared/use-phone";
import type { ExportRegisterRow } from "@/types";
import { RegisterCards } from "./RegisterCards";
import { compactRegisterColumns, registerColumns } from "./register-columns";

const defaultColDef = { sortable: true, resizable: true, suppressMovable: true };
const autoSizeStrategy = { type: "fitGridWidth" } as const;

export function RegisterTable({ rows }: { rows: ExportRegisterRow[] }) {
  const phone = useIsPhone();
  const wide = useMediaQuery("(min-width: 1280px)");
  return (
    <section
      aria-labelledby="register-title"
      className="surface flex flex-col gap-3 p-[26px] [--h2-size:24px] [--h2-tracking:-0.4px] max-md:p-5 [&_.ag-grid-scrolling-rows]:min-h-0!"
    >
      <h2 id="register-title">Paid through PayPal</h2>
      {phone ? (
        <RegisterCards rows={rows} />
      ) : (
        <AgGridReact<ExportRegisterRow>
          theme={tableGridTheme}
          rowData={rows}
          columnDefs={wide ? registerColumns : compactRegisterColumns}
          rowHeight={wide ? undefined : 64}
          defaultColDef={defaultColDef}
          autoSizeStrategy={autoSizeStrategy}
          getRowId={({ data }) => data.invoiceId}
          domLayout="autoHeight"
          tooltipShowDelay={300}
        />
      )}
    </section>
  );
}
