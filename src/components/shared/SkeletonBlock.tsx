export function SkeletonBlock({ className }: { className: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-xl bg-line/60 motion-reduce:animate-none ${className}`}
    />
  );
}
