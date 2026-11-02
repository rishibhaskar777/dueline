import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { DemoSignIn } from "@/components/demo/DemoSignIn";
import { SignInPanel } from "@/components/demo/SignInPanel";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Demo password" };

export default function DemoPage() {
  return (
    <div className="flex min-h-screen flex-col xl:flex-row">
      <SignInPanel />
      <main className="relative z-10 flex min-h-[640px] flex-col px-6 py-8 xl:flex-[44] xl:px-12">
        <div className="flex justify-end">
          <Link
            href="/"
            className={cn(buttonVariants({ variant: "outline" }), "px-[18px] font-semibold")}
          >
            Back to home
          </Link>
        </div>
        <div className="dl-up mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center gap-[22px] py-8">
          <p className="btn-secondary inline-flex items-center gap-2 self-start rounded-full px-[13px] py-[7px] text-[13px] font-bold text-muted-foreground">
            <span aria-hidden="true" className="size-2 rounded-full bg-mark-green" />
            PayPal sandbox
          </p>
          <div className="flex flex-col gap-2">
            <h1 className="font-heading text-[40px] leading-[1.04] font-extrabold tracking-[-1.2px] md:text-[46px] md:tracking-[-1.4px]">
              Open the demo
            </h1>
            <p className="text-[17px] text-muted-foreground">One password, no account needed.</p>
          </div>
          <Suspense>
            <DemoSignIn />
          </Suspense>
          <p className="text-sm leading-normal text-muted-foreground">
            Judges: the password is in the Devpost entry.
          </p>
        </div>
        <p className="text-center text-[13px] text-muted-foreground">Not affiliated with PayPal.</p>
      </main>
    </div>
  );
}
