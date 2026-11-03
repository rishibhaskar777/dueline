"use client";

import { useEffect, useState } from "react";
import { getDemoRecipient } from "@/lib/api-client";
import { forget, recall, remember } from "@/lib/remembered";

const REMEMBERED_AS = "demo-recipient";

// The demo buyer's address, asked for once however many parts of the page want it. A failed ask is
// not kept, and signing in or out forgets it with everything else remembered.
export function readDemoRecipient(): Promise<string> {
  const known = recall<Promise<string>>(REMEMBERED_AS);
  if (known) return known;
  const asked = getDemoRecipient().catch((error: unknown) => {
    if (recall(REMEMBERED_AS) === asked) forget(REMEMBERED_AS);
    throw error;
  });
  remember(REMEMBERED_AS, asked);
  return asked;
}

// The recipient route answers only in demo mode, which makes it the way the browser tells. Null
// while the answer is on its way.
export function useDemoMode(): boolean | null {
  const [inDemo, setInDemo] = useState<boolean | null>(null);

  useEffect(() => {
    let current = true;
    readDemoRecipient().then(
      () => current && setInDemo(true),
      () => current && setInDemo(false),
    );
    return () => {
      current = false;
    };
  }, []);

  return inDemo;
}
