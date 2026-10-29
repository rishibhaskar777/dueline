import { settings } from "@/mocks/fixtures";
import { settingsSchema } from "@/types";
import { stubOk } from "../_lib/stub";
import { parseBody } from "../_lib/validate";

export async function GET(): Promise<Response> {
  return stubOk(settings);
}

export async function PUT(req: Request): Promise<Response> {
  const parsed = await parseBody(req, settingsSchema);
  if (!parsed.ok) return parsed.response;
  return stubOk(parsed.data);
}
