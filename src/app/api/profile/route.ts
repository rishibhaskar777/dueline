import { connection } from "next/server";
import { getProfile, saveProfile } from "@/lib/profile";
import { profileSchema } from "@/types";
import { failFromError } from "@/app/api/_lib/errors";
import { ok } from "@/app/api/_lib/respond";
import { parseBody } from "@/app/api/_lib/validate";

export async function GET(): Promise<Response> {
  await connection();
  try {
    return ok(await getProfile());
  } catch (error) {
    return failFromError(error);
  }
}

export async function PUT(req: Request): Promise<Response> {
  const parsed = await parseBody(req, profileSchema);
  if (!parsed.ok) return parsed.response;
  try {
    return ok(await saveProfile(parsed.data));
  } catch (error) {
    return failFromError(error);
  }
}
