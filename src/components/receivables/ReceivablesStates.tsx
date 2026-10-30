import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import type { LoadError } from "./receivables-state";

export function LoadFailure({ error, onRetry }: { error: LoadError; onRetry: () => void }) {
  return (
    <div role="alert" className="max-w-xl rounded-xl border border-line bg-white p-6">
      <h2 className="text-xl font-semibold">Couldn&apos;t load your receivables</h2>
      <p className="mt-2 text-sm">{error.message}</p>
      {error.debugId && (
        <p className="mt-1 text-sm text-muted-foreground">PayPal debug ID: {error.debugId}</p>
      )}
      <Button type="button" variant="outline" className="mt-4" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

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
    <div className="max-w-xl rounded-xl border border-line bg-white p-8">
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
