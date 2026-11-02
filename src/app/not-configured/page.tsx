import type { Metadata } from "next";
import { CenteredCard } from "@/components/layout/CenteredCard";

export const metadata: Metadata = { title: "Not configured" };

export default function NotConfiguredPage() {
  return (
    <CenteredCard>
      <h1 className="mt-4 font-heading text-[32px] leading-[1.1] font-extrabold tracking-[-0.8px]">
        This deployment is not configured
      </h1>
      <p className="text-base text-muted-foreground">
        The demo password or the session secret is missing. Whoever runs this deployment needs to
        set DEMO_PASSWORD and SESSION_SECRET and restart it.
      </p>
    </CenteredCard>
  );
}
