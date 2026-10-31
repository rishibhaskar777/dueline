import { connection } from "next/server";
import { today } from "@/lib/clock";
import { buildGstr1 } from "@/lib/export/gstr1";
import { toGstr1Csv } from "@/lib/export/gstr1-csv";
import { gstr1QuerySchema } from "@/types";
import { failFromError } from "@/app/api/_lib/errors";
import { fail } from "@/app/api/_lib/respond";
import { parseQuery } from "@/app/api/_lib/validate";

export async function GET(req: Request): Promise<Response> {
  await connection();
  const parsed = parseQuery(req, gstr1QuerySchema);
  if (!parsed.ok) return parsed.response;

  const { month } = parsed.data;
  try {
    if (month > today().slice(0, 7)) {
      return fail(400, "invalid_request", "month: must not be after the current month");
    }
    return new Response(toGstr1Csv(await buildGstr1(month)), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="dueline-gstr1-${month}.csv"`,
      },
    });
  } catch (error) {
    return failFromError(error);
  }
}
