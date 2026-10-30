"use client";

import { useEffect, useState } from "react";
import { toLoadError, type LoadError } from "@/components/shared/load-error";
import { getExportRegister, getHealth } from "@/lib/api-client";
import type { ExportRegister } from "@/types";

export type RegisterState =
  | { kind: "loading" }
  | { kind: "error"; error: LoadError }
  | { kind: "ready"; register: ExportRegister };

type Clock = { currentMonth: string } | { error: LoadError } | null;
type Settled = { key: string; state: Exclude<RegisterState, { kind: "loading" }> };

export interface ExportRegisterData {
  month: string | null;
  currentMonth: string | null;
  state: RegisterState;
  setMonth: (month: string) => void;
  retry: () => void;
}

export function useExportRegister(): ExportRegisterData {
  const [attempt, setAttempt] = useState(0);
  const [clock, setClock] = useState<Clock>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [settled, setSettled] = useState<Settled | null>(null);

  // The app's own date, not the browser's, decides which month is the current one.
  useEffect(() => {
    let active = true;
    getHealth().then(
      ({ today }) => {
        if (active) setClock({ currentMonth: today.slice(0, 7) });
      },
      (error) => {
        if (active) setClock({ error: toLoadError(error) });
      },
    );
    return () => {
      active = false;
    };
  }, [attempt]);

  const currentMonth = clock && "currentMonth" in clock ? clock.currentMonth : null;
  const month = picked ?? currentMonth;
  const key = `${month}:${attempt}`;

  useEffect(() => {
    if (!month) return;
    let active = true;
    getExportRegister(month).then(
      (register) => {
        if (active) setSettled({ key, state: { kind: "ready", register } });
      },
      (error) => {
        if (active) setSettled({ key, state: { kind: "error", error: toLoadError(error) } });
      },
    );
    return () => {
      active = false;
    };
  }, [month, key]);

  let state: RegisterState = { kind: "loading" };
  if (clock && "error" in clock) state = { kind: "error", error: clock.error };
  else if (settled?.key === key) state = settled.state;

  return { month, currentMonth, state, setMonth: setPicked, retry: () => setAttempt((n) => n + 1) };
}
