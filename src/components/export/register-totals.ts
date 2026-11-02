import type { ExportRegister } from "@/types";

function payments(count: number): string {
  return `${count} ${count === 1 ? "payment" : "payments"}`;
}

export function invoicesPaid({ rows, outsideRows }: ExportRegister): number {
  return rows.length + outsideRows.length;
}

export function paypalFiraNote({ rows }: ExportRegister): string {
  return payments(rows.length);
}

// The bank transfers whose FIRC or e-BRC number has been typed in.
export function bankNote({ outsideRows }: ExportRegister): string {
  const added = outsideRows.filter((row) => row.bankReference).length;
  return `${payments(outsideRows.length)} · ${added} FIRC added`;
}
