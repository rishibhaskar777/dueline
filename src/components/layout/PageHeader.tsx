interface PageHeaderProps {
  title: string;
  intro: string;
}

export function PageHeader({ title, intro }: PageHeaderProps) {
  return (
    <header className="mb-8">
      <h1 className="text-3xl font-semibold">{title}</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">{intro}</p>
    </header>
  );
}
