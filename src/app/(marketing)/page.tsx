import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  return (
    <main className="flex min-h-screen items-center bg-navy px-4 py-16 text-white">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="text-4xl font-semibold leading-tight sm:text-6xl">
          Get paid by clients abroad without chasing them
        </h1>
        <p className="mt-6 max-w-xl text-lg text-white/80">
          See what reaches your bank in rupees, keep export paperwork ready, and let PayPal do the
          reminding.
        </p>
        <Link
          href="/receivables"
          className={cn(
            buttonVariants({ size: "lg" }),
            "mt-10 h-11 bg-white px-5 text-base text-navy hover:bg-white/90 focus-visible:ring-white/60",
          )}
        >
          Open the demo
        </Link>
      </div>
    </main>
  );
}
