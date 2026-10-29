import { risks } from "@/mocks/fixtures";
import type { ClientRisk } from "@/types";
import { clientRiskQuerySchema } from "@/types";
import { stubOk } from "../../_lib/stub";
import { parseQuery } from "../../_lib/validate";

export async function GET(req: Request): Promise<Response> {
  const parsed = parseQuery(req, clientRiskQuerySchema);
  if (!parsed.ok) return parsed.response;

  const { email } = parsed.data;
  const known = risks.find((risk) => risk.clientEmail === email);
  const noHistory: ClientRisk = {
    clientEmail: email,
    invoicesConsidered: 0,
    lateCount: 0,
    averageDaysLate: 0,
    level: "reliable",
    suggestion: null,
    reason: "No earlier invoices to this client.",
  };
  return stubOk(known ?? noHistory);
}
