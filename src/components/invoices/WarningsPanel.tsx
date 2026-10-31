interface WarningsPanelProps {
  warnings: string[];
}

export function WarningsPanel({ warnings }: WarningsPanelProps) {
  if (warnings.length === 0) return null;

  return (
    <section
      aria-labelledby="warnings-title"
      className="rounded-xl border border-due-soon bg-due-soon/10 p-4 text-sm"
    >
      <h2 id="warnings-title" className="font-semibold">
        Check these before you send
      </h2>
      <ul className="mt-2 grid gap-1">
        {warnings.map((warning) => (
          <li key={warning}>{warning}</li>
        ))}
      </ul>
    </section>
  );
}
