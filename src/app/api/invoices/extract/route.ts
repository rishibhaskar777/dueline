import { extraction } from "@/mocks/fixtures";
import { extractRequestSchema } from "@/types";
import { stubOk } from "../../_lib/stub";
import { parseBody } from "../../_lib/validate";

export async function POST(req: Request): Promise<Response> {
  const parsed = await parseBody(req, extractRequestSchema);
  if (!parsed.ok) return parsed.response;
  return stubOk(extraction);
}
