"use client";

import { useCallback, useEffect, useState } from "react";
import { toLoadError, type LoadError } from "./load-error";

export type LoadState<T> =
  { kind: "loading" } | { kind: "error"; error: LoadError } | { kind: "ready"; data: T };

// Loads one thing when the screen opens and again on `reload`, keeping what was shown until the new
// answer arrives.
export function useLoad<T>(load: () => Promise<T>): { state: LoadState<T>; reload: () => void } {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<LoadState<T>>({ kind: "loading" });

  useEffect(() => {
    let active = true;
    load().then(
      (data) => active && setState({ kind: "ready", data }),
      (error) => active && setState({ kind: "error", error: toLoadError(error) }),
    );
    return () => {
      active = false;
    };
  }, [load, attempt]);

  const reload = useCallback(() => setAttempt((count) => count + 1), []);
  return { state, reload };
}
