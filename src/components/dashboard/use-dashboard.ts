"use client";

import { useLoad, type LoadState } from "@/components/shared/use-load";
import { getDashboard } from "@/lib/api-client";
import type { DashboardResponse } from "@/types";

export type DashboardState = LoadState<DashboardResponse>;

export function useDashboard(): { state: DashboardState; retry: () => void } {
  const { state, reload } = useLoad(getDashboard);
  return { state, retry: reload };
}
