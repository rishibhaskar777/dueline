import { activity } from "@/mocks/fixtures";
import { stubOk } from "../_lib/stub";

export async function GET(): Promise<Response> {
  return stubOk({ events: activity });
}
