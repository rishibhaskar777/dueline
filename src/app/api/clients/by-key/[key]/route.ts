import { connection } from "next/server";
import { getClientDetail } from "@/lib/clients/clients";
import { clientKeySchema, type ClientDetail } from "@/types";
import { failFromError } from "@/app/api/_lib/errors";
import { ok } from "@/app/api/_lib/respond";
import { parseParam } from "@/app/api/_lib/validate";

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/clients/by-key/[key]">,
): Promise<Response> {
  await connection();
  const key = parseParam((await ctx.params).key, "key", clientKeySchema);
  if (!key.ok) return key.response;

  try {
    return ok<ClientDetail>(await getClientDetail(key.data));
  } catch (error) {
    return failFromError(error);
  }
}
