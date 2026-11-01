"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(max-width: 767px)";

function subscribe(listener: () => void): () => void {
  const list = window.matchMedia(QUERY);
  list.addEventListener("change", listener);
  return () => list.removeEventListener("change", listener);
}

// True below 768 px, where tables become lists of cards. The server and the first render say false.
export function useIsPhone(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
