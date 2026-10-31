export function RecordedOutside({ numbers }: { numbers: string[] }) {
  if (numbers.length === 0) return null;

  return (
    <p className="max-w-2xl text-sm text-muted-foreground">
      <strong className="font-medium text-foreground">
        Recorded outside PayPal (not on PayPal&apos;s FIRA): {numbers.length}
      </strong>
      <span className="tabular-nums"> · {numbers.join(", ")}</span>. Left out of the rows and the
      rupee totals.
    </p>
  );
}
