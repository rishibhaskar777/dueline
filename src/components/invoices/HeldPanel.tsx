"use client";

import Link from "next/link";
import type { HeldNotice } from "@/components/invoices/invoice-form";
import { Button, buttonVariants } from "@/components/ui/button";

interface HeldPanelProps {
  notice: HeldNotice;
  onCreateAnother: () => void;
}

export function HeldPanel({ notice, onCreateAnother }: HeldPanelProps) {
  return (
    <div role="alert" className="rounded-xl border border-due-soon bg-due-soon/10 p-4 text-sm">
      <p>{notice.message}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link href="/receivables" className={buttonVariants({ variant: "outline" })}>
          View receivables
        </Link>
        {notice.createAnother && (
          <Button type="button" variant="outline" onClick={onCreateAnother}>
            Create another
          </Button>
        )}
      </div>
    </div>
  );
}
