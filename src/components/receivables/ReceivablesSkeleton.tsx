import { SkeletonBlock } from "@/components/shared/SkeletonBlock";

export function ReceivablesSkeleton() {
  return (
    <div role="status" aria-label="Loading your receivables" className="grid gap-5">
      <SkeletonBlock className="h-[4.5rem] rounded-3xl" />
      <SkeletonBlock className="h-[4.5rem] rounded-3xl" />
      <div className="grid gap-4 lg:grid-cols-3">
        <SkeletonBlock className="h-[9.75rem] rounded-3xl" />
        <SkeletonBlock className="h-[9.75rem] rounded-3xl" />
        <SkeletonBlock className="h-[9.75rem] rounded-3xl" />
      </div>
      <div className="grid gap-x-4 gap-y-5 lg:grid-cols-6">
        <SkeletonBlock className="h-[26rem] rounded-3xl lg:col-span-4 lg:row-span-2" />
        <SkeletonBlock className="h-[16rem] rounded-3xl lg:col-span-2" />
        <SkeletonBlock className="h-[10rem] rounded-3xl lg:col-span-2" />
      </div>
      <SkeletonBlock className="h-[24rem] rounded-3xl" />
    </div>
  );
}
