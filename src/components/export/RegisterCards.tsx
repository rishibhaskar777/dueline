import { SourceTag } from "@/components/shared/SourceTag";
import { formatDate } from "@/lib/format-date";
import { formatMoney, formatRupees } from "@/lib/money/format";
import type { ExportRegisterRow } from "@/types";

// The register table as a list, for a narrow screen. The CSV has every column.
export function RegisterCards({ rows }: { rows: ExportRegisterRow[] }) {
  return (
    <ul className="grid gap-3 px-4 pb-4">
      {rows.map((row) => (
        <li key={row.invoiceId} className="grid gap-1 rounded-lg border border-line p-3 text-sm">
          <span className="flex justify-between gap-2">
            <span className="font-medium">{row.clientName}</span>
            <span className="text-muted-foreground">{row.invoiceNumber}</span>
          </span>
          <span className="flex justify-between gap-2 tabular-nums">
            <span>{formatMoney(row.foreign)}</span>
            <span>
              {formatRupees(row.inrReceived)} <SourceTag source={row.inrSource} />
            </span>
          </span>
          <span className="flex justify-between gap-2 text-muted-foreground">
            <span>Paid {formatDate(row.paidOn)}</span>
            <span className={row.purposeCode ? undefined : "text-due-soon"}>
              {row.purposeCode ? `Purpose code ${row.purposeCode}` : "Purpose code missing"}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
