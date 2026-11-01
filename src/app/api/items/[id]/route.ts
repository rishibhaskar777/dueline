import { deleteLibraryItem } from "@/lib/automation/library";
import { libraryItemIdSchema } from "@/types";
import { failFromError } from "@/app/api/_lib/errors";
import { noContent } from "@/app/api/_lib/respond";
import { parseParam } from "@/app/api/_lib/validate";

export async function DELETE(
  _req: Request,
  ctx: RouteContext<"/api/items/[id]">,
): Promise<Response> {
  const id = parseParam((await ctx.params).id, "id", libraryItemIdSchema);
  if (!id.ok) return id.response;

  try {
    await deleteLibraryItem(id.data);
    return noContent();
  } catch (error) {
    return failFromError(error);
  }
}
