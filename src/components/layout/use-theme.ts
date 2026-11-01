"use client";

import { useSyncExternalStore } from "react";
import { currentTheme } from "./theme";
import type { Theme } from "./theme-model";

// The page's class is the source of truth, so a change from anywhere reaches every reader.
function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, currentTheme, () => "light");
}
