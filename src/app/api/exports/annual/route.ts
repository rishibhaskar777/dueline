import { connection } from "next/server";
import { today } from "@/lib/clock";
import { financialYearOf, financialYearRange } from "@/lib/date-math";
import { buildAnnualSummary } from "@/lib/export/annual";
import { toAnnualCsv } from "@/lib/export/annual-csv";
import { annualQuerySchema, type AnnualSummary } from "@/types";
import { failFromError } from "@/app/api/_lib/errors";
import { fail, ok } from "@/app/api/_lib/respond";
import { parseQuery } from "@/app/api/_lib/validate";

export async function GET(req: Request): Promise<Response> {
  await connection();
  const parsed = parseQuery(req, annualQuerySchema);
  if (!parsed.ok) return parsed.response;

  const { fy, format } = parsed.data;
  try {
    if (financialYearRange(fy).from > today()) {
      return fail(
        400,
        "invalid_request",
        `fy: must not be after ${financialYearOf(today().slice(0, 7))}`,
      );
    }
    const summary = await buildAnnualSummary(fy);
    if (format !== "csv") return ok<AnnualSummary>(summary);

    return new Response(toAnnualCsv(summary), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="dueline-year-summary-${fy}.csv"`,
      },
    });
  } catch (error) {
    return failFromError(error);
  }
}
