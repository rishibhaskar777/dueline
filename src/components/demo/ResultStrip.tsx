import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// What a demo action answered: green when it worked, red when it did not.
export function ResultStrip({ failed, children }: { failed: boolean; children: ReactNode }) {
  return (
    <p
      role={failed ? "alert" : "status"}
      className={cn(
        "rounded-2xl px-4 py-3 text-[15px] font-semibold",
        failed ? "bg-tint-red text-late" : "bg-tint-green text-paid",
      )}
    >
      {children}
    </p>
  );
}
