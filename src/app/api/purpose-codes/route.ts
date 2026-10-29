import { purposeCodes } from "@/mocks/fixtures";
import { stubOk } from "@/app/api/_lib/stub";

export async function GET(): Promise<Response> {
  return stubOk({ codes: purposeCodes });
}
