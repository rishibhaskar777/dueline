"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CopyLinkButton({ link }: { link: string }) {
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
      <Button type="button" variant="outline" onClick={copy}>
        Copy payer link
      </Button>
      <span role="status" className="text-sm text-muted-foreground">
        {state === "copied" && "Link copied."}
        {state === "failed" && "Could not copy. Select the link on PayPal instead."}
      </span>
    </>
  );
}
