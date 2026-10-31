import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { RiskBadge } from "@/components/shared/RiskBadge";
import { SourceTag } from "@/components/shared/SourceTag";
import { formatDate } from "@/lib/format-date";
import { formatMoney, formatRupees } from "@/lib/money/format";
import type { InvoiceSummary } from "@/types";
import { rupeesFromPayPal, statusLabel } from "./invoice-status";
import { StatusBadge } from "./StatusBadge";

type Params = ICellRendererParams<InvoiceSummary>;

export interface GridContext {
  today: string;
}

function StatusCell({ data, context }: Params) {
  return data ? <StatusBadge invoice={data} today={(context as GridContext).today} /> : null;
}

function ClientCell({ data }: Params) {
  if (!data) return null;
  const flagged = data.riskLevel === "watch" || data.riskLevel === "late_payer";
  return (
    <span className="flex items-center gap-2">
      <span className="truncate">{data.client.name}</span>
      {flagged && data.riskLevel && <RiskBadge level={data.riskLevel} />}
    </span>
  );
}

function PayoutCell({ data }: Params) {
  if (!data || data.payoutInr === null) return <span className="text-muted-foreground">–</span>;
  return (
    <span className="tabular-nums">
      {formatRupees(data.payoutInr)} <SourceTag reportedByPayPal={rupeesFromPayPal(data)} />
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
  { headerName: "Client", field: "client.name", cellRenderer: ClientCell, width: 250 },
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
