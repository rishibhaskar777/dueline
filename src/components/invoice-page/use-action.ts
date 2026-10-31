"use client";

import { useState } from "react";

interface Action {
  pending: boolean;
  error: string | null;
  // Runs the call; on success `done` runs, on failure the message stays for the user to read.
  run: (call: () => Promise<unknown>, done: () => void) => Promise<void>;
}

export function useAction(): Action {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(call: () => Promise<unknown>, done: () => void): Promise<void> {
    setPending(true);
    setError(null);
    try {
      await call();
      done();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong. Try again.");
    } finally {
      setPending(false);
    }
  }

  return { pending, error, run };
}
