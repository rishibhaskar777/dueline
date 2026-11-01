import { unmergeClient } from "@/lib/clients/clients";
import { clientKeySchema } from "@/types";
import { failFromError } from "@/app/api/_lib/errors";
import { noContent } from "@/app/api/_lib/respond";
import { parseParam } from "@/app/api/_lib/validate";

export async function DELETE(
  _req: Request,
  ctx: RouteContext<"/api/clients/by-key/[key]/merged/[from]">,
): Promise<Response> {
  const params = await ctx.params;
  const key = parseParam(params.key, "key", clientKeySchema);
  if (!key.ok) return key.response;
  const from = parseParam(params.from, "from", clientKeySchema);
  if (!from.ok) return from.response;

  try {
    await unmergeClient(key.data, from.data);
    return noContent();
  } catch (error) {
    return failFromError(error);
  }
}
