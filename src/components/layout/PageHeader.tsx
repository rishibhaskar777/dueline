interface PageHeaderProps {
  title: string;
  intro: string;
}

export function PageHeader({ title, intro }: PageHeaderProps) {
  return (
    <header className="mb-8">
      <h1 className="text-4xl font-extrabold tracking-[-1px] md:text-5xl md:tracking-[-1.4px]">
        {title}
      </h1>
      <p className="mt-2 max-w-2xl text-[17px] text-muted-foreground">{intro}</p>
    </header>
  );
}
