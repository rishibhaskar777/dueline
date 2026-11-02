"use client";

import { useMediaQuery } from "./use-media-query";

// True below 768 px, where tables become lists of cards.
export function useIsPhone(): boolean {
  return useMediaQuery("(max-width: 767px)");
}
