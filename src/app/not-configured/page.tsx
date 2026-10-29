import type { Metadata } from "next";

export const metadata: Metadata = { title: "Not configured" };

export default function NotConfiguredPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-semibold">This deployment is not configured</h1>
        <p className="mt-3 text-muted-foreground">
          The demo password or the session secret is missing. Whoever runs this deployment needs to
          set DEMO_PASSWORD and SESSION_SECRET and restart it.
        </p>
      </div>
    </main>
  );
}
