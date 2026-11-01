"use client";

import { useEffect, useState } from "react";
import { getHealth } from "@/lib/api-client";
import type { HealthResponse } from "@/types";

type State = { kind: "loading" } | { kind: "error" } | { kind: "ready"; health: HealthResponse };

function problemsIn(health: HealthResponse): string[] {
  const problems: string[] = [];
  if (health.paypal === "error") problems.push("PayPal sandbox is not responding");
  if (health.ai === "missing_key") problems.push("AI key is missing, fill invoices by hand");
  if (health.storage === "error") problems.push("Storage is not responding");
  return problems;
}

export function StatusLine() {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    getHealth()
      .then((health) => {
        if (!cancelled) setState({ kind: "ready", health });
      })
      .catch(() => {
        if (!cancelled) setState({ kind: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.kind === "loading") {
    return <p className="text-sm text-sidebar-foreground/80">Checking connection…</p>;
  }
  if (state.kind === "error") {
    return <p className="text-sm text-late-on-dark">Cannot reach the Dueline server</p>;
  }

  const { health } = state;
  const connected = health.paypal === "connected";
  const problems = problemsIn(health);

  return (
    <div className="space-y-1 text-sm" role="status">
      {health.offline && (
        <p className="w-fit rounded-md bg-sidebar-accent px-2 py-0.5 text-xs font-medium text-sidebar-foreground">
          Offline demo
        </p>
      )}
      <p className="flex items-center gap-2 text-sidebar-foreground">
        <span
          aria-hidden="true"
          className={
            connected
              ? "size-2 rounded-full bg-paid-on-dark"
              : "size-2 rounded-full bg-late-on-dark"
          }
        />
        {health.offline
          ? "Simulated PayPal sandbox"
          : connected
            ? "PayPal sandbox connected"
            : "PayPal sandbox not connected"}
      </p>
      {problems
        .filter((problem) => connected || !problem.startsWith("PayPal"))
        .map((problem) => (
          <p key={problem} className="text-late-on-dark">
            {problem}
          </p>
        ))}
      {health.demoClock && (
        <p className="text-xs text-sidebar-foreground/80">Demo date: {health.today}</p>
      )}
    </div>
  );
}
