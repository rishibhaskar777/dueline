"use client";

import { useSyncExternalStore } from "react";

let count = 0;
const listeners = new Set<() => void>();

// The Receivables poll publishes what it reads, so the sidebar's count moves with it.
export function publishOverdueCount(next: number): void {
  if (next === count) return;
  count = next;
  listeners.forEach((listener) => listener());
}

export function subscribeToOverdueCount(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function readOverdueCount(): number {
  return count;
}

export function useOverdueCount(): number {
  return useSyncExternalStore(subscribeToOverdueCount, readOverdueCount, () => 0);
}
