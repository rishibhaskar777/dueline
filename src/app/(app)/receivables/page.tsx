import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Receivables } from "@/components/receivables/Receivables";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Receivables" };

export default function ReceivablesPage() {
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="Money owed to you"
          intro="Each invoice is a line from the day you sent it to the day it was paid."
        />
        <Link href="/invoices/new" className={buttonVariants({ size: "lg" })}>
          New invoice
        </Link>
      </div>
      <Receivables />
    </>
  );
}
