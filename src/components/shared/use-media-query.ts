"use client";

import { useSyncExternalStore } from "react";

// The server and the first render say false.
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (listener) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", listener);
      return () => list.removeEventListener("change", listener);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
