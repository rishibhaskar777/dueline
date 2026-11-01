"use client";

import { useEffect, useState } from "react";
import { toLoadError, type LoadError } from "@/components/shared/load-error";
import { getExportRegister, getHealth } from "@/lib/api-client";
import type { ExportRegister } from "@/types";
import { fallbackNote } from "./register-text";

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
  // Said when the current month has no payments and an earlier month is shown instead.
  note: string | null;
  setMonth: (month: string) => void;
  retry: () => void;
}

export function useExportRegister(): ExportRegisterData {
  const [attempt, setAttempt] = useState(0);
  const [clock, setClock] = useState<Clock>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [fallback, setFallback] = useState<string | null>(null);
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
  const month = picked ?? fallback ?? currentMonth;
  const key = `${month}:${attempt}`;

  useEffect(() => {
    if (!month) return;
    let active = true;
    getExportRegister(month).then(
      (register) => {
        if (!active) return;
        const empty = register.rows.length === 0 && register.outsideRows.length === 0;
        const latest = register.latestMonthWithPayments;
        if (empty && latest && picked === null && fallback === null && month === currentMonth) {
          setFallback(latest);
          return;
        }
        setSettled({ key, state: { kind: "ready", register } });
      },
      (error) => {
        if (active) setSettled({ key, state: { kind: "error", error: toLoadError(error) } });
      },
    );
    return () => {
      active = false;
    };
  }, [month, key, picked, fallback, currentMonth]);

  let state: RegisterState = { kind: "loading" };
  if (clock && "error" in clock) state = { kind: "error", error: clock.error };
  else if (settled?.key === key) state = settled.state;

  const note =
    picked === null && fallback !== null && currentMonth
      ? fallbackNote(currentMonth, fallback)
      : null;

  return {
    month,
    currentMonth,
    state,
    note,
    setMonth: setPicked,
    retry: () => setAttempt((n) => n + 1),
  };
}
