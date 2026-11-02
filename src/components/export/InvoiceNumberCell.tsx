import type { ICellRendererParams } from "ag-grid-community";
import Link from "next/link";

interface NumberedRow {
  invoiceId: string;
  invoiceNumber: string;
}

export function InvoiceNumberCell({ data }: ICellRendererParams<NumberedRow>) {
  if (!data) return null;
  return (
    <Link
      href={`/invoices/${encodeURIComponent(data.invoiceId)}`}
      aria-label={`Open invoice ${data.invoiceNumber}`}
      className="font-bold text-link"
    >
      {data.invoiceNumber}
    </Link>
  );
}
