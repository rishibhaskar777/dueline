import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { cn } from "@/lib/utils";
import { totalsLines, type GridTotals } from "./grid-totals";

// The label, Invoice and Client columns become one cell, wide enough for "Total for October 2026".
const LABEL_SPAN = 3;

interface TotalsCellParams extends ICellRendererParams {
  lines: string[];
  right: boolean;
}

function TotalsCell({ lines, right }: TotalsCellParams) {
  return (
    <span
      className={cn("flex flex-col justify-center leading-[22px] font-bold", right && "items-end")}
    >
      {lines.map((line) => (
        <span key={line} className="tabular-nums">
          {line}
        </span>
      ))}
    </span>
  );
}

// Adds a pinned bottom row to a grid's columns: the first column spans three, and every column
// shows its line of the totals instead of its own value. The row's data is only a marker, so the
// getters and formatters that read a payment's fields skip it.
export function withTotalsRow<T>(columns: ColDef<T>[], totals: GridTotals): ColDef<T>[] {
  return columns.map((column, index) => {
    const { valueGetter, valueFormatter, tooltipValueGetter } = column;
    return {
      ...column,
      colSpan: index === 0 ? ({ node }) => (node?.rowPinned ? LABEL_SPAN : 1) : column.colSpan,
      valueGetter:
        typeof valueGetter === "function"
          ? (params) => (params.node?.rowPinned ? null : valueGetter(params))
          : valueGetter,
      valueFormatter:
        typeof valueFormatter === "function"
          ? (params) => (params.node?.rowPinned ? "" : valueFormatter(params))
          : valueFormatter,
      tooltipValueGetter: tooltipValueGetter
        ? (params) => (params.node?.rowPinned ? "" : tooltipValueGetter(params))
        : undefined,
      cellRendererSelector: (params) =>
        params.node.rowPinned
          ? {
              component: TotalsCell,
              params: {
                lines: totalsLines(totals, column.headerName ?? ""),
                right: column.type === "rightAligned",
              },
            }
          : undefined,
    };
  });
}
