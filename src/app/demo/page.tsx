import type { Metadata } from "next";
import { Suspense } from "react";
import { DemoSignIn } from "@/components/demo/DemoSignIn";
import { Wordmark } from "@/components/layout/Wordmark";

export const metadata: Metadata = { title: "Demo password" };

export default function DemoPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm overflow-hidden rounded-xl border border-line bg-white">
        <div className="bg-navy px-6 py-4">
          <Wordmark />
        </div>
        <div className="p-6">
          <Suspense>
            <DemoSignIn />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
