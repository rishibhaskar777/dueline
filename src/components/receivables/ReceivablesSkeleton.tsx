import { SkeletonBlock } from "@/components/shared/SkeletonBlock";

export function ReceivablesSkeleton() {
  return (
    <div role="status" aria-label="Loading your receivables" className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <SkeletonBlock className="h-[8.25rem]" />
        <SkeletonBlock className="h-[8.25rem]" />
        <SkeletonBlock className="h-[8.25rem]" />
      </div>
      <SkeletonBlock className="h-[26rem]" />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <SkeletonBlock className="h-[26rem]" />
        <SkeletonBlock className="h-[20rem]" />
      </div>
    </div>
  );
}
