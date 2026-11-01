"use client";

import { getHealth } from "@/lib/api-client";
import { useLoad } from "./use-load";

// Whether the server is running the offline demo. False until known, which is the right answer for
// every screen that is waiting on its own data anyway.
export function useOffline(): boolean {
  const { state } = useLoad(getHealth);
  return state.kind === "ready" && state.data.offline;
}
