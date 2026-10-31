"use client";

import { getHealth } from "@/lib/api-client";
import { useLoad } from "./use-load";

// The date the app is using, which can be the demo date. Empty until known; the only thing that
// reads it is the "Due today" label, which then simply waits.
export function useToday(): string {
  const { state } = useLoad(getHealth);
  return state.kind === "ready" ? state.data.today : "";
}
