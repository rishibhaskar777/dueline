import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type PillVariant = "primary" | "secondary" | "white" | "glass";

// "white" and "glass" are for the navy and black bands, where the page theme does not apply.
const VARIANTS: Record<PillVariant, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  white:
    "bg-white/90 text-[#0a2a7a] shadow-[inset_0_1px_0_#fff,0_10px_24px_rgba(0,0,0,0.2)] backdrop-blur-md",
  glass:
    "border border-white/30 bg-white/14 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] backdrop-blur-md",
};

interface SitePillProps {
  href: string;
  variant: PillVariant;
  children: ReactNode;
  // The page's large buttons are 17 px; the bar and small actions are 15 px.
  small?: boolean;
  className?: string;
}

export function SitePill({ href, variant, children, small = false, className }: SitePillProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center justify-center rounded-full font-bold transition-transform duration-300 ease-spring hover:scale-[1.04] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none motion-reduce:hover:transform-none max-md:min-h-11",
        small ? "px-[22px] py-3 text-[15px]" : "px-7 py-[15px] text-[17px]",
        VARIANTS[variant],
        className,
      )}
    >
      {children}
    </Link>
  );
}
