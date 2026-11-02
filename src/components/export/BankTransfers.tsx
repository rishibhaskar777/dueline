"use client";

import Link from "next/link";
import { AgGridReact } from "ag-grid-react";
import { tableGridTheme } from "@/components/grid/ag-grid";
import { useIsPhone } from "@/components/shared/use-phone";
import { formatDate } from "@/lib/format-date";
import { formatMoney, formatRupees } from "@/lib/money/format";
import type { ExportOutsideRow } from "@/types";
import { BankReferenceInput } from "./BankReferenceInput";
import { bankColumns } from "./bank-columns";

const defaultColDef = { sortable: true, resizable: true, suppressMovable: true };
const autoSizeStrategy = { type: "fitGridWidth" } as const;

function BankCards({ rows }: { rows: ExportOutsideRow[] }) {
  return (
    <ul className="grid gap-3">
      {rows.map((row) => (
        <li key={row.invoiceId} className="grid gap-2 rounded-2xl bg-inner p-3.5 text-sm">
          <span className="flex justify-between gap-2">
            <span className="font-semibold">{row.clientName}</span>
            <Link
              href={`/invoices/${encodeURIComponent(row.invoiceId)}`}
              aria-label={`Open invoice ${row.invoiceNumber}`}
              className="font-bold text-link"
            >
              {row.invoiceNumber}
            </Link>
          </span>
          <span className="flex justify-between gap-2 tabular-nums">
            <span>{formatMoney(row.foreign)}</span>
            <span>{formatRupees(row.inrReceived)}</span>
          </span>
          <span className="text-muted-foreground">Paid {formatDate(row.paidOn)}</span>
          <BankReferenceInput
            invoiceId={row.invoiceId}
            invoiceNumber={row.invoiceNumber}
            initial={row.bankReference}
          />
        </li>
      ))}
    </ul>
  );
}

// Payments recorded as bank transfers have no PayPal FIRA. The bank's FIRC or e-BRC is their proof, so
// the number is kept here and goes into the CSV for the CA.
export function BankTransfers({ rows }: { rows: ExportOutsideRow[] }) {
  const phone = useIsPhone();
  if (rows.length === 0) return null;

  return (
    <section
      aria-labelledby="bank-title"
      className="surface flex flex-col gap-3 p-[26px] [--h2-size:24px] [--h2-tracking:-0.4px] max-md:p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 id="bank-title">Bank transfers</h2>
        <p className="text-[13px] text-muted-foreground">
          Not on PayPal&apos;s FIRA. Type your bank&apos;s FIRC or e-BRC number; Enter saves, Escape
          undoes.
        </p>
      </div>
      {phone ? (
        <BankCards rows={rows} />
      ) : (
        <AgGridReact<ExportOutsideRow>
          theme={tableGridTheme}
          rowData={rows}
          columnDefs={bankColumns}
          defaultColDef={defaultColDef}
          autoSizeStrategy={autoSizeStrategy}
          getRowId={({ data }) => data.invoiceId}
          domLayout="autoHeight"
        />
      )}
    </section>
  );
}
