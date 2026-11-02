import type { ColDef, ICellRendererParams } from "ag-grid-community";
import Link from "next/link";
import { RiskBadge } from "@/components/shared/RiskBadge";
import { formatDate } from "@/lib/format-date";
import { formatMoney, formatRupees } from "@/lib/money/format";
import type { InvoiceSummary } from "@/types";
import { payoutSourceWord, tableStatusLabel } from "./invoice-status";
import { StatusBadge } from "./StatusBadge";

type Params = ICellRendererParams<InvoiceSummary>;

export interface GridContext {
  today: string;
}

function StatusCell({ data, context }: Params) {
  return data ? (
    <StatusBadge invoice={data} today={(context as GridContext).today} detailed />
  ) : null;
}

// The risk badge sits under the name, so a long name keeps its whole width and every column fits.
function ClientCell({ data }: Params) {
  if (!data) return null;
  const flagged = data.riskLevel === "watch" || data.riskLevel === "late_payer";
  return (
    <span className="flex h-full items-center gap-2 leading-tight font-semibold">
      <span className="min-w-0 truncate" title={data.client.name}>
        {data.client.name}
      </span>
      {flagged && data.riskLevel && <RiskBadge level={data.riskLevel} />}
    </span>
  );
}

function NumberCell({ data }: Params) {
  if (!data) return null;
  return (
    <Link
      href={`/invoices/${encodeURIComponent(data.id)}`}
      onClick={(event) => event.stopPropagation()}
      aria-label={`Open invoice ${data.number}`}
      className="font-bold text-link underline"
    >
      {data.number}
    </Link>
  );
}

function PayoutCell({ data }: Params) {
  if (!data || data.payoutInr === null) return <span className="text-muted-foreground">–</span>;
  return (
    <span className="tabular-nums">
      {formatRupees(data.payoutInr)}
      {data.payoutSource && (
        <span className="ml-1 text-xs text-subtle">{payoutSourceWord(data.payoutSource)}</span>
      )}
    </span>
  );
}

function PayPalCell({ data }: Params) {
  if (!data) return null;
  return (
    <a
      href={data.payLink}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(event) => event.stopPropagation()}
      aria-label={`View invoice ${data.number} on PayPal (opens in a new tab)`}
      className="font-semibold text-link underline"
    >
      View ↗
    </a>
  );
}

// Work, issue date and purpose code live in the invoice panel. They stay in the grid, hidden, so the
// search still finds them.
export const invoiceColumns: ColDef<InvoiceSummary>[] = [
  { headerName: "Invoice", field: "number", cellRenderer: NumberCell, width: 110, minWidth: 100 },
  {
    headerName: "Client",
    field: "client.name",
    cellRenderer: ClientCell,
    width: 200,
    minWidth: 140,
  },
  {
    headerName: "Amount",
    valueGetter: ({ data }) => (data ? Number(data.amount.value) : 0),
    valueFormatter: ({ data }) => (data ? formatMoney(data.amount) : ""),
    type: "rightAligned",
    cellClass: ["ag-right-aligned-cell", "tabular-nums"],
    width: 120,
    minWidth: 100,
  },
  {
    headerName: "To your bank",
    field: "payoutInr",
    valueFormatter: ({ value }) => (typeof value === "number" ? formatRupees(value) : ""),
    cellRenderer: PayoutCell,
    type: "rightAligned",
    width: 180,
    minWidth: 150,
  },
  {
    headerName: "Due",
    field: "dueOn",
    valueFormatter: ({ value }) => formatDate(value),
    width: 120,
    minWidth: 105,
  },
  {
    headerName: "Status",
    valueGetter: ({ data, context }) =>
      data ? tableStatusLabel(data, (context as GridContext).today) : "",
    cellRenderer: StatusCell,
    width: 180,
    minWidth: 140,
  },
  {
    headerName: "PayPal",
    colId: "open",
    sortable: false,
    type: "rightAligned",
    cellRenderer: PayPalCell,
    width: 100,
    minWidth: 85,
  },
  { headerName: "Work", field: "work", hide: true },
  { headerName: "Issued", field: "issuedOn", hide: true },
  { headerName: "Purpose code", field: "purposeCode", hide: true },
];
