"use client";

import { AgGridReact } from "ag-grid-react";
import { gridTheme } from "@/components/grid/ag-grid";
import { useIsPhone } from "@/components/shared/use-phone";
import { formatDate } from "@/lib/format-date";
import { formatMoney, formatRupees } from "@/lib/money/format";
import type { ExportOutsideRow } from "@/types";
import { BankReferenceInput } from "./BankReferenceInput";
import { bankColumns } from "./bank-columns";

const defaultColDef = { sortable: true, resizable: true, suppressMovable: true };

interface BankTransfersProps {
  rows: ExportOutsideRow[];
  paypalFiraInr: number;
  bankInr: number;
}

function BankCards({ rows }: { rows: ExportOutsideRow[] }) {
  return (
    <ul className="grid gap-3 px-4 pb-4">
      {rows.map((row) => (
        <li key={row.invoiceId} className="grid gap-2 rounded-lg border border-line p-3 text-sm">
          <span className="flex justify-between gap-2">
            <span className="font-medium">{row.clientName}</span>
            <span className="text-muted-foreground">{row.invoiceNumber}</span>
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
export function BankTransfers({ rows, paypalFiraInr, bankInr }: BankTransfersProps) {
  const phone = useIsPhone();
  if (rows.length === 0) return null;

  return (
    <section aria-labelledby="bank-title" className="rounded-xl border border-line bg-card">
      <div className="p-6">
        <h2 id="bank-title" className="text-xl font-semibold">
          Bank transfers
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Recorded as paid outside PayPal, so they are not on PayPal&apos;s FIRA. Type the number
          from your bank&apos;s FIRC or e-BRC in each row; Enter or leaving the box saves it, Escape
          undoes the change. Rupees are at the ECB rate of the payment date.
        </p>
        <dl aria-label="Totals by proof" className="mt-4 flex flex-wrap gap-x-10 gap-y-3">
          <div>
            <dt className="text-sm text-muted-foreground">On PayPal&apos;s FIRA</dt>
            <dd className="font-heading text-2xl font-semibold tabular-nums">
              {formatRupees(paypalFiraInr)}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">By bank transfer</dt>
            <dd className="font-heading text-2xl font-semibold tabular-nums">
              {formatRupees(bankInr)}
            </dd>
          </div>
        </dl>
      </div>
      {phone ? (
        <BankCards rows={rows} />
      ) : (
        <AgGridReact<ExportOutsideRow>
          theme={gridTheme}
          rowData={rows}
          columnDefs={bankColumns}
          defaultColDef={defaultColDef}
          getRowId={({ data }) => data.invoiceId}
          domLayout="autoHeight"
        />
      )}
    </section>
  );
}
