import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { formatDate } from "@/lib/format-date";
import { formatMoney, formatRupees } from "@/lib/money/format";
import type { InvoiceSummary } from "@/types";
import { statusLabel } from "./invoice-status";
import { StatusBadge } from "./StatusBadge";

type Params = ICellRendererParams<InvoiceSummary>;

export interface GridContext {
  today: string;
}

function StatusCell({ data, context }: Params) {
  return data ? <StatusBadge invoice={data} today={(context as GridContext).today} /> : null;
}

function PayoutCell({ data }: Params) {
  if (!data || data.payoutInr === null) return <span className="text-muted-foreground">–</span>;
  return (
    <span className="tabular-nums">
      {formatRupees(data.payoutInr)}{" "}
      <span className="ml-1 rounded bg-ground px-1.5 py-0.5 text-xs text-muted-foreground">
        {data.actualPayout ? "PayPal" : "est."}
      </span>
    </span>
  );
}

function OpenCell({ data }: Params) {
  if (!data || data.dueState === "paid") return null;
  return (
    <a
      href={data.payLink}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(event) => event.stopPropagation()}
      aria-label={`Open invoice ${data.number} on PayPal (opens in a new tab)`}
      className="text-blue underline underline-offset-2"
    >
      Open
    </a>
  );
}

export const invoiceColumns: ColDef<InvoiceSummary>[] = [
  { headerName: "Invoice", field: "number", width: 120 },
  { headerName: "Client", field: "client.name", width: 190 },
  { headerName: "Work", field: "work", flex: 1, minWidth: 180 },
  {
    headerName: "Amount",
    valueGetter: ({ data }) => (data ? Number(data.amount.value) : 0),
    valueFormatter: ({ data }) => (data ? formatMoney(data.amount) : ""),
    type: "rightAligned",
    cellClass: "tabular-nums",
    width: 130,
  },
  {
    headerName: "To your bank",
    field: "payoutInr",
    valueFormatter: ({ value }) => (typeof value === "number" ? formatRupees(value) : ""),
    cellRenderer: PayoutCell,
    type: "rightAligned",
    width: 170,
  },
  {
    headerName: "Issued",
    field: "issuedOn",
    valueFormatter: ({ value }) => formatDate(value),
    width: 130,
  },
  {
    headerName: "Due",
    field: "dueOn",
    valueFormatter: ({ value }) => formatDate(value),
    width: 130,
  },
  {
    headerName: "Status",
    valueGetter: ({ data, context }) =>
      data ? statusLabel(data, (context as GridContext).today) : "",
    cellRenderer: StatusCell,
    width: 120,
  },
  {
    headerName: "Days late",
    field: "daysLate",
    valueFormatter: ({ value }) => (value > 0 ? String(value) : "–"),
    type: "rightAligned",
    cellClass: "tabular-nums",
    width: 110,
  },
  {
    headerName: "Purpose code",
    field: "purposeCode",
    valueFormatter: ({ value }) => value ?? "–",
    width: 130,
  },
  {
    headerName: "PayPal",
    colId: "open",
    sortable: false,
    cellRenderer: OpenCell,
    width: 90,
  },
];
