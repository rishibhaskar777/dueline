function Block({ className }: { className: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-xl bg-line/60 ${className}`} />;
}

export function ReceivablesSkeleton() {
  return (
    <div role="status" aria-label="Loading your receivables" className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Block className="h-[8.25rem]" />
        <Block className="h-[8.25rem]" />
        <Block className="h-[8.25rem]" />
      </div>
      <Block className="h-[26rem]" />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <Block className="h-[26rem]" />
        <Block className="h-[20rem]" />
      </div>
    </div>
  );
}
