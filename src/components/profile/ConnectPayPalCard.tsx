import { Button } from "@/components/ui/button";
import { REPOSITORY_URL } from "@/lib/repository";

const DECISION_URL = `${REPOSITORY_URL}/blob/main/docs/decisions/0019-many-freelancers.md`;

export function ConnectPayPalCard() {
  return (
    <section
      aria-labelledby="connect-title"
      className="max-w-3xl rounded-xl border border-line bg-card p-6"
    >
      <h2 id="connect-title" className="text-xl font-semibold">
        Connect your PayPal
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Today Dueline is connected to one PayPal business account. The next step for many
        freelancers is PayPal&apos;s partner onboarding with invoicing permissions, so each person
        can connect their own account.{" "}
        <a
          href={DECISION_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue underline underline-offset-2"
        >
          How this would work
        </a>
        .
      </p>
      <Button type="button" variant="outline" className="mt-4" disabled>
        Connect PayPal (coming next)
      </Button>
    </section>
  );
}
