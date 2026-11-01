import { Button } from "@/components/ui/button";
import type { LoadError } from "./load-error";

interface LoadFailureProps {
  title: string;
  error: LoadError;
  onRetry: () => void;
}

export function LoadFailure({ title, error, onRetry }: LoadFailureProps) {
  return (
    <div role="alert" className="max-w-xl rounded-xl border border-line bg-card p-6">
      <h2 className="text-xl font-semibold">{title}</h2>
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
