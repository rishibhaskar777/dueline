import Link from "next/link";
import { CenteredCard } from "@/components/layout/CenteredCard";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <CenteredCard>
      <p className="mt-4 text-sm font-semibold text-muted-foreground">Error 404</p>
      <h1 className="font-heading text-[40px] leading-[1.05] font-extrabold tracking-[-1px] max-md:text-[32px]">
        This page is not on the line
      </h1>
      <p className="text-base text-muted-foreground">
        The page you are looking for does not exist or has moved.
      </p>
      <div className="mt-4 flex flex-wrap gap-2.5">
        <Link href="/receivables" className={cn(buttonVariants({ size: "lg" }), "px-6 font-bold")}>
          Go to Home
        </Link>
        <Link
          href="/"
          className={cn(buttonVariants({ variant: "outline", size: "lg" }), "px-6 font-bold")}
        >
          Back to the website
        </Link>
      </div>
    </CenteredCard>
  );
}
