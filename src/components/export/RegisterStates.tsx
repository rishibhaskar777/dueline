import { SkeletonBlock } from "@/components/shared/SkeletonBlock";
import { formatMonth } from "@/lib/format-date";

export function RegisterSkeleton() {
  return (
    <div role="status" aria-label="Loading the export register" className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SkeletonBlock className="h-[8.25rem]" />
        <SkeletonBlock className="h-[8.25rem]" />
        <SkeletonBlock className="h-[8.25rem]" />
      </div>
      <SkeletonBlock className="h-[20rem]" />
    </div>
  );
}

export function EmptyRegister({ month }: { month: string }) {
  return (
    <div className="max-w-xl rounded-xl border border-line bg-card p-8">
      <h2 className="text-xl font-semibold">Nothing to register</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        No invoices were paid in {formatMonth(month)}.
      </p>
    </div>
  );
}
