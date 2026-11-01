import { mergeClient } from "@/lib/clients/clients";
import { clientKeySchema, mergeClientRequestSchema, type MergeClientResponse } from "@/types";
import { failFromError } from "@/app/api/_lib/errors";
import { ok } from "@/app/api/_lib/respond";
import { parseBody, parseParam } from "@/app/api/_lib/validate";

export async function POST(
  req: Request,
  ctx: RouteContext<"/api/clients/by-key/[key]/merge">,
): Promise<Response> {
  const key = parseParam((await ctx.params).key, "key", clientKeySchema);
  if (!key.ok) return key.response;
  const parsed = await parseBody(req, mergeClientRequestSchema);
  if (!parsed.ok) return parsed.response;

  try {
    await mergeClient(key.data, parsed.data.into);
    return ok<MergeClientResponse>({ from: key.data, into: parsed.data.into });
  } catch (error) {
    return failFromError(error);
  }
}
