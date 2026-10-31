"use client";

import { useEffect, useState } from "react";
import { getClientRisk } from "@/lib/api-client";
import { clientRiskQuerySchema, type ClientRisk } from "@/types";

const TYPING_PAUSE_MS = 400;

export interface KnownRisk {
  email: string;
  name: string;
  risk: ClientRisk | null;
}

type Outcome = { key: string; risk: ClientRisk | null };

function keyOf(email: string, name: string): string | null {
  const query = clientRiskQuerySchema.safeParse({
    email: email.trim(),
    name: name.trim() || undefined,
  });
  return query.success ? `${query.data.name ?? ""}|${query.data.email}` : null;
}

// Reads the client's history once the email is valid and the typing has paused. A reading the
// server already made for the starting email and name is used as it is.
export function useClientRisk(email: string, name: string, known?: KnownRisk): ClientRisk | null {
  const key = keyOf(email, name);
  const knownKey = known?.risk ? keyOf(known.email, known.name) : null;
  const [outcome, setOutcome] = useState<Outcome | null>(
    known?.risk && knownKey ? { key: knownKey, risk: known.risk } : null,
  );

  useEffect(() => {
    if (!key || key === knownKey) return;
    let current = true;
    const timer = setTimeout(() => {
      getClientRisk(email.trim(), name.trim() || undefined).then(
        (risk) => current && setOutcome({ key, risk }),
        () => current && setOutcome({ key, risk: null }),
      );
    }, TYPING_PAUSE_MS);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [email, name, key, knownKey]);

  return outcome && outcome.key === key ? outcome.risk : null;
}
