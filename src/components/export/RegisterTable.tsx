"use client";

import { AgGridReact } from "ag-grid-react";
import type { RowHeightParams } from "ag-grid-community";
import { useCallback, useMemo, useRef } from "react";
import { tableGridTheme } from "@/components/grid/ag-grid";
import { useMediaQuery } from "@/components/shared/use-media-query";
import { useIsPhone } from "@/components/shared/use-phone";
import type { ExportRegisterRow } from "@/types";
import { exportGridCsv, gridCsvFileName } from "./grid-export";
import { GridExport } from "./GridExport";
import { paypalGridTotals, totalsRowHeight } from "./grid-totals";
import { RegisterCards } from "./RegisterCards";
import { compactRegisterColumns, registerColumns } from "./register-columns";
import { withTotalsRow } from "./totals-row";

const defaultColDef = { sortable: true, resizable: true, suppressMovable: true };
const autoSizeStrategy = { type: "fitGridWidth" } as const;
const TOTALS_MARKER = [{}];

export function RegisterTable({ rows, month }: { rows: ExportRegisterRow[]; month: string }) {
  const phone = useIsPhone();
  const wide = useMediaQuery("(min-width: 1280px)");
  const grid = useRef<AgGridReact<ExportRegisterRow>>(null);
  const totals = useMemo(() => paypalGridTotals(rows, month), [rows, month]);
  const columns = useMemo(
    () => withTotalsRow(wide ? registerColumns : compactRegisterColumns, totals),
    [wide, totals],
  );

  const rowHeight = useCallback(
    ({ node }: RowHeightParams<ExportRegisterRow>) =>
      node.rowPinned ? totalsRowHeight(totals) : wide ? undefined : 64,
    [totals, wide],
  );

  return (
    <section
      aria-labelledby="register-title"
      className="surface flex flex-col gap-3 p-[26px] [--h2-size:24px] [--h2-tracking:-0.4px] max-md:p-5 [&_.ag-grid-scrolling-rows]:min-h-0!"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <h2 id="register-title">Paid through PayPal</h2>
        {!phone && (
          <GridExport
            id="register-export-hint"
            onExport={() => {
              const api = grid.current?.api;
              if (api) exportGridCsv(api, gridCsvFileName("paypal", month));
            }}
          />
        )}
      </div>
      {phone ? (
        <RegisterCards rows={rows} />
      ) : (
        <AgGridReact<ExportRegisterRow>
          ref={grid}
          theme={tableGridTheme}
          rowData={rows}
          pinnedBottomRowData={TOTALS_MARKER}
          columnDefs={columns}
          getRowHeight={rowHeight}
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
