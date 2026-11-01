import { connection } from "next/server";
import { listLibrary, saveLibraryItem } from "@/lib/automation/library";
import { saveLibraryItemRequestSchema, type LibraryItem, type LibraryItemsResponse } from "@/types";
import { failFromError } from "@/app/api/_lib/errors";
import { ok } from "@/app/api/_lib/respond";
import { parseBody } from "@/app/api/_lib/validate";

export async function GET(): Promise<Response> {
  await connection();
  try {
    return ok<LibraryItemsResponse>({ items: await listLibrary() });
  } catch (error) {
    return failFromError(error);
  }
}

export async function POST(req: Request): Promise<Response> {
  const parsed = await parseBody(req, saveLibraryItemRequestSchema);
  if (!parsed.ok) return parsed.response;

  try {
    return ok<LibraryItem>(await saveLibraryItem(parsed.data));
  } catch (error) {
    return failFromError(error);
  }
}
