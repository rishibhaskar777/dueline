import { stubNoContent } from "@/app/api/_lib/stub";

export async function POST(): Promise<Response> {
  return stubNoContent();
}
