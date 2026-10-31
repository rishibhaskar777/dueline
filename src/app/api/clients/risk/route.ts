import { getClientRisk } from "@/lib/risk/client-risk";
import { clientRiskQuerySchema, type ClientRisk } from "@/types";
import { failFromError } from "@/app/api/_lib/errors";
import { ok } from "@/app/api/_lib/respond";
import { parseQuery } from "@/app/api/_lib/validate";

export async function GET(req: Request): Promise<Response> {
  const parsed = parseQuery(req, clientRiskQuerySchema);
  if (!parsed.ok) return parsed.response;

  try {
    return ok<ClientRisk>(await getClientRisk(parsed.data.email, parsed.data.name));
  } catch (error) {
    return failFromError(error);
  }
}
