import { deleteRepeat, setRepeatPaused } from "@/lib/automation/repeats";
import { repeatIdSchema, updateRepeatRequestSchema, type RepeatSchedule } from "@/types";
import { failFromError } from "@/app/api/_lib/errors";
import { noContent, ok } from "@/app/api/_lib/respond";
import { parseBody, parseParam } from "@/app/api/_lib/validate";

export async function PATCH(
  req: Request,
  ctx: RouteContext<"/api/repeats/[id]">,
): Promise<Response> {
  const id = parseParam((await ctx.params).id, "id", repeatIdSchema);
  if (!id.ok) return id.response;
  const parsed = await parseBody(req, updateRepeatRequestSchema);
  if (!parsed.ok) return parsed.response;

  try {
    return ok<RepeatSchedule>(await setRepeatPaused(id.data, parsed.data.paused));
  } catch (error) {
    return failFromError(error);
  }
}

export async function DELETE(
  _req: Request,
  ctx: RouteContext<"/api/repeats/[id]">,
): Promise<Response> {
  const id = parseParam((await ctx.params).id, "id", repeatIdSchema);
  if (!id.ok) return id.response;

  try {
    await deleteRepeat(id.data);
    return noContent();
  } catch (error) {
    return failFromError(error);
  }
}
