import { sendReminderRequestSchema } from "@/types";
import { stubOk } from "@/app/api/_lib/stub";
import { parseBody } from "@/app/api/_lib/validate";

export async function POST(req: Request): Promise<Response> {
  const parsed = await parseBody(req, sendReminderRequestSchema);
  if (!parsed.ok) return parsed.response;
  return stubOk({ sentAt: new Date().toISOString() });
}
