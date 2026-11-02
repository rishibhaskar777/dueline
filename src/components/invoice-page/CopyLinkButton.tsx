"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CopyLinkButton({ link, className }: { link: string; className?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(link);
      setState("copied");
    } catch {
      setState("failed");
    }
  }

  return (
    <>
      <Button type="button" variant="outline" className={className} onClick={copy}>
        Copy payer link
      </Button>
      <span role="status" className="text-sm text-muted-foreground empty:hidden">
        {state === "copied" && "Link copied."}
        {state === "failed" && "Could not copy. Select the link on PayPal instead."}
      </span>
    </>
  );
}
