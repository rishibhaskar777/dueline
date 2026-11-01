import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { findPurposeCode } from "@/lib/export/purpose-codes";
import { formatDate } from "@/lib/format-date";
import { formatMoney, formatRupees } from "@/lib/money/format";
import type { ExportOutsideRow } from "@/types";
import { BankReferenceInput } from "./BankReferenceInput";

type Params = ICellRendererParams<ExportOutsideRow>;

function ReferenceCell({ data, api }: Params) {
  if (!data) return null;
  return (
    <BankReferenceInput
      invoiceId={data.invoiceId}
      invoiceNumber={data.invoiceNumber}
      initial={data.bankReference}
      onLayoutChange={() => api.resetRowHeights()}
    />
  );
}

function purposeTooltip(row: ExportOutsideRow): string {
  if (!row.purposeCode) return "No purpose code. Ask your CA which one to use.";
  return findPurposeCode(row.purposeCode)?.label ?? "";
}

export const bankColumns: ColDef<ExportOutsideRow>[] = [
  {
    headerName: "Paid on",
    field: "paidOn",
    valueFormatter: ({ value }) => formatDate(value),
    width: 115,
  },
  { headerName: "Invoice", field: "invoiceNumber", width: 105 },
  { headerName: "Client", field: "clientName", width: 170 },
  {
    headerName: "Amount",
    valueGetter: ({ data }) => (data ? Number(data.foreign.value) : 0),
    valueFormatter: ({ data }) => (data ? formatMoney(data.foreign) : ""),
    type: "rightAligned",
    cellClass: "tabular-nums",
    width: 115,
  },
  {
    headerName: "Rupees",
    field: "inrReceived",
    valueFormatter: ({ value }) => formatRupees(value),
    type: "rightAligned",
    cellClass: "tabular-nums",
    width: 125,
  },
  {
    headerName: "Purpose code",
    field: "purposeCode",
    valueFormatter: ({ value }) => value ?? "Missing",
    tooltipValueGetter: ({ data }) => (data ? purposeTooltip(data) : ""),
    width: 125,
  },
  {
    headerName: "FIRC / e-BRC no.",
    field: "bankReference",
    sortable: false,
    cellRenderer: ReferenceCell,
    autoHeight: true,
    flex: 1,
    minWidth: 220,
  },
];
