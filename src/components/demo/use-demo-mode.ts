"use client";

import { useEffect, useState } from "react";
import { getDemoRecipient } from "@/lib/api-client";

// The recipient route answers only in demo mode, which makes it the way the browser tells. Null
// while the answer is on its way.
export function useDemoMode(): boolean | null {
  const [inDemo, setInDemo] = useState<boolean | null>(null);

  useEffect(() => {
    let current = true;
    getDemoRecipient().then(
      () => current && setInDemo(true),
      () => current && setInDemo(false),
    );
    return () => {
      current = false;
    };
  }, []);

  return inDemo;
}
