import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <p className="text-sm font-medium text-muted-foreground">Error 404</p>
        <h1 className="mt-2 text-4xl font-semibold">This page is not on the line</h1>
        <p className="mt-3 text-muted-foreground">
          The page you are looking for does not exist or has moved.
        </p>
        <Link href="/receivables" className={`${buttonVariants({ size: "lg" })} mt-8 h-10 px-4`}>
          Go to receivables
        </Link>
      </div>
    </main>
  );
}
