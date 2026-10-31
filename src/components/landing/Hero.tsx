import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DueLineIllustration } from "./DueLineIllustration";

export function Hero() {
  return (
    <header className="bg-navy px-4 py-16 text-white sm:py-24">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <p className="font-heading text-lg font-medium text-blue-light">Dueline</p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight sm:text-6xl">
            Get paid by clients abroad without chasing them
          </h1>
          <p className="mt-6 max-w-xl text-lg text-white/80">
            For freelancers in India who are paid through PayPal: see what reaches your bank in
            rupees, spot clients who pay late, and keep your export paperwork ready.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
            <Link
              href="/receivables"
              className={cn(
                buttonVariants({ size: "lg" }),
                "h-11 bg-white px-5 text-base text-navy hover:bg-white/90 focus-visible:ring-white/60",
              )}
            >
              Open the demo
            </Link>
            <a
              href="#how"
              className="rounded-md text-base font-medium text-white underline underline-offset-4 outline-none hover:text-white/80 focus-visible:ring-2 focus-visible:ring-white/60"
            >
              How it works
            </a>
          </div>
        </div>
        <DueLineIllustration />
      </div>
    </header>
  );
}
