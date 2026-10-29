import { exportRegister } from "@/mocks/fixtures";
import { exportRegisterQuerySchema } from "@/types";
import type { ExportRegister } from "@/types";
import { stubOk, stubText } from "@/app/api/_lib/stub";
import { parseQuery } from "@/app/api/_lib/validate";

const CSV_HEADER = [
  "Invoice",
  "Client",
  "Country",
  "Paid on",
  "Currency",
  "Amount",
  "INR received",
  "INR source",
  "Purpose code",
];

function csvCell(value: string | number | null): string {
  const text = value === null ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function toCsv(register: ExportRegister): string {
  const rows = register.rows.map((row) =>
    [
      row.invoiceNumber,
      row.clientName,
      row.clientCountry,
      row.paidOn,
      row.foreign.currency,
      row.foreign.value,
      row.inrReceived,
      row.inrSource,
      row.purposeCode,
    ]
      .map(csvCell)
      .join(","),
  );
  return [CSV_HEADER.join(","), ...rows].join("\n") + "\n";
}

export async function GET(req: Request): Promise<Response> {
  const parsed = parseQuery(req, exportRegisterQuerySchema);
  if (!parsed.ok) return parsed.response;

  const { month, format } = parsed.data;
  const register = { ...exportRegister, month };
  if (format !== "csv") return stubOk(register);

  return stubText(toCsv(register), {
    "content-type": "text/csv; charset=utf-8",
    "content-disposition": `attachment; filename="dueline-export-${month}.csv"`,
  });
}
