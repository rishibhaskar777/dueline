import { REPOSITORY_URL } from "@/lib/repository";

const DECISION_URL = `${REPOSITORY_URL}/blob/main/docs/decisions/0019-many-freelancers.md`;

export function ConnectPayPalCard() {
  return (
    <section
      aria-labelledby="connect-title"
      className="flex flex-col gap-3 rounded-[24px] bg-navy-card p-6 text-white"
    >
      <h2
        id="connect-title"
        className="font-heading text-xl leading-tight font-extrabold tracking-[-0.2px]"
      >
        Connect your PayPal
      </h2>
      <p className="text-[15px] leading-relaxed text-navy-card-muted">
        Today Dueline is connected to one PayPal business account. Next: each freelancer connects
        their own through PayPal&apos;s partner onboarding.{" "}
        <a
          href={DECISION_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-white underline underline-offset-2"
        >
          How this would work
        </a>
      </p>
      <button
        type="button"
        disabled
        aria-disabled="true"
        className="cursor-default self-start rounded-full bg-white/16 px-5 py-3 font-bold text-white"
      >
        Connect PayPal · coming next
      </button>
    </section>
  );
}
