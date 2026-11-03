import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { SourceTag } from "@/components/shared/SourceTag";
import { findPurposeCode } from "@/lib/export/purpose-codes";
import { formatDate } from "@/lib/format-date";
import { formatMoney, formatRate, formatRupees } from "@/lib/money/format";
import type { ExportRegisterRow, Money } from "@/types";
import { InvoiceNumberCell } from "./InvoiceNumberCell";

type Params = ICellRendererParams<ExportRegisterRow>;

function moneyOrDash(money: Money | null | undefined): string {
  return money ? formatMoney(money) : "–";
}

function RupeesCell({ data }: Params) {
  if (!data) return null;
  return (
    <span className="tabular-nums">
      {formatRupees(data.inrReceived)}{" "}
      <SourceTag
        source={data.inrSource}
        feeFromPayPal={data.fee !== null}
        rateDate={data.rateDate}
      />
    </span>
  );
}

function rupeesTooltip(row: ExportRegisterRow): string {
  if (row.inrSource === "paypal") return "The rupees PayPal reported for this payment.";
  if (row.rateUsed === null || row.rateDate === null) return "Estimated.";
  const rate = `${formatRate(row.rateUsed)} rupees per ${row.foreign.currency}: the ECB rate of ${formatDate(row.rateDate)} less PayPal's markup`;
  return row.fee !== null
    ? `Fee and net from PayPal. The rupees are estimated at ${rate}.`
    : `Estimated at ${rate}.`;
}

function PurposeCell({ data }: Params) {
  if (!data) return null;
  if (!data.purposeCode) return <span className="text-due-soon">Missing</span>;
  return <span className="font-medium">{data.purposeCode}</span>;
}

function purposeTooltip(row: ExportRegisterRow): string {
  if (!row.purposeCode) return "No purpose code. Ask your CA which one to use.";
  return findPurposeCode(row.purposeCode)?.label ?? "";
}

function ClientWithTransactionCell({ data }: Params) {
  if (!data) return null;
  return (
    <span className="flex flex-col justify-center leading-tight">
      <span className="truncate">{data.clientName}</span>
      <span className="font-mono text-xs break-all whitespace-normal text-muted-foreground">
        {data.transactionId ?? "–"}
      </span>
    </span>
  );
}

const fullColumns: ColDef<ExportRegisterRow>[] = [
  {
    headerName: "Paid on",
    field: "paidOn",
    valueFormatter: ({ value }) => formatDate(value),
    width: 115,
  },
  { headerName: "Invoice", field: "invoiceNumber", cellRenderer: InvoiceNumberCell, width: 110 },
  { headerName: "Client", field: "clientName", width: 150 },
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
    cellRenderer: RupeesCell,
    tooltipValueGetter: ({ data }) => (data ? rupeesTooltip(data) : ""),
    type: "rightAligned",
    width: 175,
  },
  {
    headerName: "Code",
    headerTooltip: "Purpose code",
    field: "purposeCode",
    cellRenderer: PurposeCell,
    tooltipValueGetter: ({ data }) => (data ? purposeTooltip(data) : ""),
    width: 90,
  },
  {
    headerName: "LUT",
    field: "underLut",
    cellDataType: false,
    valueFormatter: ({ value }) => (value ? "Yes" : "No"),
    width: 75,
  },
  {
    headerName: "Transaction ID",
    field: "transactionId",
    valueFormatter: ({ value }) => value ?? "–",
    cellClass: "font-mono text-[13px]",
    width: 260,
  },
  {
    headerName: "Fee",
    headerTooltip: "PayPal fee",
    valueGetter: ({ data }) => (data?.fee ? Number(data.fee.value) : null),
    valueFormatter: ({ data }) => moneyOrDash(data?.fee),
    type: "rightAligned",
    cellClass: "tabular-nums",
    width: 110,
  },
  {
    headerName: "Net",
    valueGetter: ({ data }) => (data?.net ? Number(data.net.value) : null),
    valueFormatter: ({ data }) => moneyOrDash(data?.net),
    type: "rightAligned",
    cellClass: "tabular-nums",
    width: 120,
  },
];

// Under 1280 px the LUT and Fee columns go and the transaction ID sits under the client name, which
// leaves enough width for every other value to show in full. The fee is still the gap between
// Amount and Net.
const COMPACT_HIDDEN = new Set(["LUT", "Fee", "Transaction ID"]);

export const compactRegisterColumns: ColDef<ExportRegisterRow>[] = fullColumns
  .filter((column) => !COMPACT_HIDDEN.has(column.headerName ?? ""))
  .map((column) =>
    column.field === "clientName"
      ? { ...column, cellRenderer: ClientWithTransactionCell, width: 200 }
      : column.field === "paidOn"
        ? { ...column, width: 125 }
        : column,
  );

export const registerColumns = fullColumns;
