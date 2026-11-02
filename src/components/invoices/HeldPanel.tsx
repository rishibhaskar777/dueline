"use client";

import Link from "next/link";
import type { HeldNotice } from "@/components/invoices/invoice-form";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface HeldPanelProps {
  notice: HeldNotice;
  onCreateAnother: () => void;
}

export function HeldPanel({ notice, onCreateAnother }: HeldPanelProps) {
  return (
    <div
      role="alert"
      className="rounded-[20px] bg-tint-amber p-[18px] text-[15px] font-semibold text-due-soon"
    >
      <p>{notice.message}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href="/receivables"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-11 px-5 font-bold text-foreground",
          )}
        >
          View receivables
        </Link>
        {notice.createAnother && (
          <Button
            type="button"
            variant="outline"
            className="h-11 px-5 font-bold text-foreground"
            onClick={onCreateAnother}
          >
            Create another
          </Button>
        )}
      </div>
    </div>
  );
}
