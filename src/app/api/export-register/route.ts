import { connection } from "next/server";
import { today } from "@/lib/clock";
import { toCsv } from "@/lib/export/csv";
import { buildExportRegister } from "@/lib/export/register";
import { getProfile } from "@/lib/profile";
import { exportRegisterQuerySchema, type ExportRegister } from "@/types";
import { failFromError } from "@/app/api/_lib/errors";
import { fail, ok } from "@/app/api/_lib/respond";
import { parseQuery } from "@/app/api/_lib/validate";

export async function GET(req: Request): Promise<Response> {
  await connection();
  const parsed = parseQuery(req, exportRegisterQuerySchema);
  if (!parsed.ok) return parsed.response;

  const { month, format } = parsed.data;
  try {
    if (month > today().slice(0, 7)) {
      return fail(400, "invalid_request", "month: must not be after the current month");
    }
    const register = await buildExportRegister(month);
    if (format !== "csv") return ok<ExportRegister>(register);

    return new Response(toCsv(register, (await getProfile()).gstin), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="dueline-export-${month}.csv"`,
      },
    });
  } catch (error) {
    return failFromError(error);
  }
}
