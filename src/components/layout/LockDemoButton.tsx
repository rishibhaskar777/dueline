"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { signOut } from "@/lib/api-client";

export function LockDemoButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function lock(): Promise<void> {
    setPending(true);
    try {
      await signOut();
      router.push("/demo");
    } catch {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={lock}
      disabled={pending}
      className="flex min-h-11 w-fit items-center rounded-md text-sm text-sidebar-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-sidebar-ring disabled:opacity-50"
    >
      Lock demo
    </button>
  );
}
