export function SourceTag({ reportedByPayPal }: { reportedByPayPal: boolean }) {
  return (
    <span className="ml-1 rounded bg-ground px-1.5 py-0.5 text-xs text-muted-foreground">
      {reportedByPayPal ? "PayPal" : "est."}
    </span>
  );
}
