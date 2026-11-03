import "server-only";
import { after } from "next/server";

// Runs work once the response has been sent. Outside a request (the daily job, scripts, tests)
// there is no response to wait for, so the work just starts.
export function afterResponse(work: () => Promise<void>): void {
  try {
    after(work);
  } catch {
    void work();
  }
}
