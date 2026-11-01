"use client";

import { useLoad } from "@/components/shared/use-load";
import { getLibraryItems } from "@/lib/api-client";
import type { LibraryItem } from "@/types";

interface Library {
  // Empty until the library has loaded, and when it cannot be loaded.
  items: LibraryItem[];
  reload: () => void;
}

export function useLibrary(): Library {
  const { state, reload } = useLoad(getLibraryItems);
  return { items: state.kind === "ready" ? state.data : [], reload };
}
