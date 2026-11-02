import type { ReactNode } from "react";

interface PageIntroProps {
  chip: string;
  title: string;
  children: ReactNode;
}

// The top of every inner public page: a chip, the page's one h1 and a sentence under it.
export function PageIntro({ chip, title, children }: PageIntroProps) {
  return (
    <header className="dl-up mx-auto flex max-w-[1100px] flex-col items-center gap-[18px] px-4 pt-14 pb-12 text-center md:px-6 md:pt-20 md:pb-14">
      <p className="btn-secondary rounded-full px-3.5 py-2 text-sm font-bold">{chip}</p>
      <h1 className="font-heading text-[44px] leading-[1.04] font-extrabold tracking-[-1.4px] md:text-[64px] lg:text-[76px] lg:tracking-[-2.2px]">
        {title}
      </h1>
      <p className="max-w-[680px] text-lg leading-relaxed text-muted-foreground md:text-xl">
        {children}
      </p>
    </header>
  );
}
