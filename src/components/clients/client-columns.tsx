import { clientHref } from "@/components/clients/client-href";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import Link from "next/link";
import { RiskBadge } from "@/components/shared/RiskBadge";
import { formatDate } from "@/lib/format-date";
import { wholeDays } from "@/lib/format-days";
import { formatRupees } from "@/lib/money/format";
import type { ClientSummary } from "@/types";

function NameCell({ data }: ICellRendererParams<ClientSummary>) {
  if (!data) return null;
  return (
    <span className="flex items-center gap-2">
      <Link
        href={clientHref(data.key)}
        onClick={(event) => event.stopPropagation()}
        className="truncate font-medium text-blue underline-offset-2 hover:underline"
      >
        {data.name}
      </Link>
      {data.riskLevel && <RiskBadge level={data.riskLevel} />}
    </span>
  );
}

const rupees = ({ value }: { value?: number }): string =>
  typeof value === "number" ? formatRupees(value) : "";

export const clientColumns: ColDef<ClientSummary>[] = [
  { headerName: "Client", field: "name", cellRenderer: NameCell, flex: 1, minWidth: 240 },
  { headerName: "Invoices", field: "invoices", type: "rightAligned", width: 110 },
  {
    headerName: "Billed",
    field: "billedInr",
    valueFormatter: rupees,
    type: "rightAligned",
    cellClass: "tabular-nums",
    width: 140,
  },
  {
    headerName: "Outstanding",
    field: "outstandingInr",
    valueFormatter: rupees,
    type: "rightAligned",
    cellClass: "tabular-nums",
    width: 150,
  },
  {
    headerName: "Average days late",
    field: "averageDaysLate",
    valueFormatter: ({ value }) => (value > 0 ? String(wholeDays(value)) : "–"),
    type: "rightAligned",
    cellClass: "tabular-nums",
    width: 170,
  },
  {
    headerName: "Last paid",
    field: "lastPaidOn",
    valueFormatter: ({ value }) => (value ? formatDate(value) : "–"),
    width: 130,
  },
  { headerName: "Why", field: "riskReason", hide: true },
];
