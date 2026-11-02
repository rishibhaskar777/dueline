import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  intro: string;
  // Sits on the right, level with the bottom of the heading; wraps under it on a phone.
  actions?: ReactNode;
}

export function PageHeader({ title, intro, actions }: PageHeaderProps) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-4xl font-extrabold tracking-[-1px] md:text-5xl md:tracking-[-1.4px]">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl text-[17px] text-muted-foreground">{intro}</p>
      </div>
      {actions}
    </header>
  );
}
