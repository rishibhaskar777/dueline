import { connection } from "next/server";
import { getSettings, saveSettings } from "@/lib/settings";
import { settingsSchema } from "@/types";
import { failFromError } from "@/app/api/_lib/errors";
import { ok } from "@/app/api/_lib/respond";
import { parseBody } from "@/app/api/_lib/validate";

export async function GET(): Promise<Response> {
  await connection();
  try {
    return ok(await getSettings());
  } catch (error) {
    return failFromError(error);
  }
}

export async function PUT(req: Request): Promise<Response> {
  const parsed = await parseBody(req, settingsSchema);
  if (!parsed.ok) return parsed.response;
  try {
    return ok(await saveSettings(parsed.data));
  } catch (error) {
    return failFromError(error);
  }
}
