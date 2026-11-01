import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import type { LoadError } from "@/components/shared/load-error";

export function RefreshNote({ error }: { error: LoadError }) {
  return (
    <p role="status" className="text-sm text-due-soon">
      Couldn&apos;t refresh. Showing the last data we have. {error.message}
      {error.debugId && ` (PayPal debug ID: ${error.debugId})`}
    </p>
  );
}

export function EmptyReceivables() {
  return (
    <div className="max-w-xl rounded-xl border border-line bg-card p-8">
      <h2 className="text-xl font-semibold">No invoices yet</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Paste a client chat and Dueline drafts the invoice. You approve it before PayPal sends it.
      </p>
      <Link href="/invoices/new" className={`${buttonVariants()} mt-5`}>
        Create your first invoice
      </Link>
    </div>
  );
}
