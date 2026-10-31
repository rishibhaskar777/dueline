import { saveClientNotes } from "@/lib/clients/clients";
import { clientKeySchema, clientNotesRequestSchema, type ClientNotesResponse } from "@/types";
import { failFromError } from "@/app/api/_lib/errors";
import { ok } from "@/app/api/_lib/respond";
import { parseBody, parseParam } from "@/app/api/_lib/validate";

export async function PUT(
  req: Request,
  ctx: RouteContext<"/api/clients/by-key/[key]/notes">,
): Promise<Response> {
  const key = parseParam((await ctx.params).key, "key", clientKeySchema);
  if (!key.ok) return key.response;
  const parsed = await parseBody(req, clientNotesRequestSchema);
  if (!parsed.ok) return parsed.response;

  try {
    return ok<ClientNotesResponse>({ notes: await saveClientNotes(key.data, parsed.data.notes) });
  } catch (error) {
    return failFromError(error);
  }
}
