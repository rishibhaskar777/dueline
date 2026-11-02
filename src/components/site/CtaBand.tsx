import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { DEMO_HREF } from "./site-nav";
import { SitePill } from "./SitePill";

interface CtaBandProps {
  tone: "navy" | "black";
  title: string;
  // A sentence under the title.
  children?: ReactNode;
}

// The closing band of an inner page: one sentence and the way into the demo.
export function CtaBand({ tone, title, children }: CtaBandProps) {
  return (
    <section
      className={cn(
        "mt-5 flex flex-wrap items-center justify-between gap-6 rounded-[36px] p-8 text-white md:p-14",
        tone === "navy" ? "bg-navy-band" : "bg-black",
      )}
    >
      <div className="flex max-w-[620px] flex-col gap-2.5">
        <h2 className="font-heading text-[34px] leading-[1.06] font-extrabold tracking-[-1px] md:text-[46px] md:tracking-[-1.2px]">
          {title}
        </h2>
        {children && <p className="text-base text-white/80">{children}</p>}
      </div>
      <SitePill href={DEMO_HREF} variant={tone === "navy" ? "white" : "glass"}>
        Open the demo
      </SitePill>
    </section>
  );
}
