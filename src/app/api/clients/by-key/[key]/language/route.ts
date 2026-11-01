import { saveClientLanguage } from "@/lib/clients/clients";
import { clientKeySchema, clientLanguageRequestSchema, type ClientLanguageResponse } from "@/types";
import { failFromError } from "@/app/api/_lib/errors";
import { ok } from "@/app/api/_lib/respond";
import { parseBody, parseParam } from "@/app/api/_lib/validate";

export async function PUT(
  req: Request,
  ctx: RouteContext<"/api/clients/by-key/[key]/language">,
): Promise<Response> {
  const key = parseParam((await ctx.params).key, "key", clientKeySchema);
  if (!key.ok) return key.response;
  const parsed = await parseBody(req, clientLanguageRequestSchema);
  if (!parsed.ok) return parsed.response;

  try {
    return ok<ClientLanguageResponse>({
      language: await saveClientLanguage(key.data, parsed.data.language),
    });
  } catch (error) {
    return failFromError(error);
  }
}
