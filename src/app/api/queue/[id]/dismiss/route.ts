import { dismissQueueItem } from "@/lib/automation/queue";
import { queueItemIdSchema, type DismissQueueResponse } from "@/types";
import { failFromError } from "@/app/api/_lib/errors";
import { ok } from "@/app/api/_lib/respond";
import { parseParam } from "@/app/api/_lib/validate";

export async function POST(
  _req: Request,
  ctx: RouteContext<"/api/queue/[id]/dismiss">,
): Promise<Response> {
  const id = parseParam((await ctx.params).id, "id", queueItemIdSchema);
  if (!id.ok) return id.response;

  try {
    await dismissQueueItem(id.data);
    return ok<DismissQueueResponse>({ dismissed: true });
  } catch (error) {
    return failFromError(error);
  }
}
