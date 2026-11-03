"use client";

import { useCallback, useEffect, useState } from "react";
import { toLoadError, type LoadError } from "./load-error";
import { recall, remember } from "@/lib/remembered";

export type LoadState<T> =
  { kind: "loading" } | { kind: "error"; error: LoadError } | { kind: "ready"; data: T };

// Loads one thing when the screen opens and again on `reload`, keeping what was shown until the new
// answer arrives. With `rememberAs`, opening the screen again starts from the last answer.
export function useLoad<T>(
  load: () => Promise<T>,
  rememberAs?: string,
): { state: LoadState<T>; reload: () => void } {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<LoadState<T>>(() => {
    const last = rememberAs ? recall<T>(rememberAs) : undefined;
    return last === undefined ? { kind: "loading" } : { kind: "ready", data: last };
  });

  useEffect(() => {
    let active = true;
    load().then(
      (data) => {
        if (rememberAs) remember(rememberAs, data);
        if (active) setState({ kind: "ready", data });
      },
      (error) => active && setState({ kind: "error", error: toLoadError(error) }),
    );
    return () => {
      active = false;
    };
  }, [load, attempt, rememberAs]);

  const reload = useCallback(() => setAttempt((count) => count + 1), []);
  return { state, reload };
}
