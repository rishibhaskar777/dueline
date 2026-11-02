import type { ReactNode } from "react";
import { Wordmark } from "./Wordmark";

// A single frosted card in the middle of the page, for the 404 and "not configured" pages.
export function CenteredCard({ children }: { children: ReactNode }) {
  return (
    <main className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
      <div className="surface flex w-full max-w-[520px] flex-col items-start gap-3 p-10 max-md:p-7 [--surface-radius:32px]">
        <Wordmark />
        {children}
      </div>
    </main>
  );
}
