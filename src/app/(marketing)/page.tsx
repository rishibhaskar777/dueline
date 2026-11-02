import type { Metadata } from "next";
import Link from "next/link";
import { IconTile, type TileTone } from "@/components/shared/IconTile";
import { ChoiceSection } from "@/components/site/ChoiceSection";
import { DEMO_HREF } from "@/components/site/site-nav";
import { SitePill } from "@/components/site/SitePill";
import { StaticDueLine, type SampleLine } from "@/components/site/StaticDueLine";

export const metadata: Metadata = {
  title: { absolute: "Dueline: get paid by clients abroad" },
  description:
    "Dueline shows Indian freelancers what their PayPal invoices will pay in rupees, flags clients who pay late and keeps export paperwork ready.",
};

const SAMPLE_LINES: SampleLine[] = [
  {
    client: "Tandem Health",
    meta: "0025 · $900.00",
    from: 66,
    to: 80,
    tone: "blue",
    ended: false,
    label: "Due in 12 days",
  },
  {
    client: "Okafor & Reyes",
    meta: "0019 · €720.00",
    from: 57,
    to: 80,
    tone: "late",
    ended: false,
    label: "8 days late",
  },
  {
    client: "Halden Coffee Co.",
    meta: "0021 · $180.00",
    from: 40,
    to: 74,
    tone: "paid",
    ended: true,
    label: "Paid on time",
  },
];

const SAMPLE_SUMMARY =
  "The due line draws each invoice from sent to paid. Tandem Health is due in 12 days, Okafor and Reyes is 8 days late, and Halden Coffee Co. paid on time.";

interface Feature {
  mark: string;
  tone: TileTone;
  title: string;
  body: string;
  more: string;
  href: string;
}

const FEATURES: Feature[] = [
  {
    mark: "Aa",
    tone: "blue",
    title: "Chat to invoice",
    body: "Paste what your client wrote. The AI drafts every line and shows the words it came from.",
    more: "How it works",
    href: "/how-it-works",
  },
  {
    mark: "!",
    tone: "red",
    title: "Late-payer radar",
    body: "Each client is scored from their history, so late payers get a firmer reminder.",
    more: "All features",
    href: "/features",
  },
  {
    mark: "✓",
    tone: "green",
    title: "Ready for your CA",
    body: "Purpose codes, LUT, SAC, GSTR-1 rows and a register that matches FIRA and FIRC.",
    more: "For your CA",
    href: "/for-your-ca",
  },
];

function Total({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string;
  note: string;
  tone?: "late" | "navy";
}) {
  const navy = tone === "navy";
  return (
    <div
      className={
        navy
          ? "flex flex-col gap-1.5 rounded-[22px] bg-navy-band p-[22px] text-white"
          : "surface flex flex-col gap-1.5 p-[22px] [--surface-radius:22px]"
      }
    >
      <p className={navy ? "font-semibold text-[#bcd3ff]" : "font-semibold text-muted-foreground"}>
        {label}
      </p>
      <p
        className={`font-heading text-[42px] leading-[1.1] font-extrabold tracking-[-1px] tabular-nums max-md:text-[34px] ${tone === "late" ? "text-late" : ""}`}
      >
        {value}
      </p>
      <p className={navy ? "text-sm text-[#bcd3ff]" : "text-sm text-subtle"}>{note}</p>
    </div>
  );
}

export default function LandingPage() {
  return (
    <>
      <section className="dl-up mx-auto flex max-w-[1200px] flex-col items-center gap-[22px] px-4 pt-14 pb-10 text-center md:px-6 md:pt-[72px]">
        <p className="btn-secondary inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-bold">
          <span aria-hidden="true" className="size-2 rounded-full bg-mark-green" />
          For freelancers in India paid through PayPal
        </p>
        <h1 className="mt-1 max-w-[1000px] font-heading text-5xl leading-none font-extrabold tracking-[-1.5px] md:text-[72px] md:tracking-[-2.2px] lg:text-[92px] lg:tracking-[-2.8px]">
          Get paid from abroad. Without chasing.
        </h1>
        <p className="max-w-[700px] text-lg leading-relaxed text-muted-foreground md:text-[21px]">
          Turn a client chat into a PayPal invoice, see what reaches your bank in rupees, spot late
          payers early and keep export paperwork ready for your CA.
        </p>
        <div className="mt-1.5 flex flex-wrap justify-center gap-3">
          <SitePill href={DEMO_HREF} variant="primary">
            Open the demo
          </SitePill>
          <SitePill href="/how-it-works" variant="secondary">
            See how it works
          </SitePill>
        </div>
      </section>

      <section
        aria-label="Product preview"
        className="mx-auto max-w-[1200px] px-4 pt-4 pb-20 md:px-6 md:pb-[100px]"
      >
        <div className="surface grid gap-4 p-7 max-md:p-4 md:grid-cols-3 [--surface-radius:32px]">
          <Total label="Outstanding" value="₹2,44,713" note="Estimated after PayPal's fee" />
          <Total
            label="Overdue"
            value="₹1,41,558"
            note="2 invoices · reminders drafted"
            tone="late"
          />
          <Total
            label="Paid in the last 30 days"
            value="₹1,71,249"
            note="₹79,049 through PayPal"
            tone="navy"
          />
          <div className="surface p-6 md:col-span-3 [--h2-size:24px] [--h2-tracking:-0.5px] [--surface-radius:22px]">
            <div className="flex flex-wrap items-baseline justify-between gap-2 pb-2">
              <h2 className="font-heading text-2xl font-extrabold tracking-[-0.5px]">
                The due line
              </h2>
              <p className="text-sm text-subtle">
                Each invoice runs from sent to paid. Past its due date it turns red.
              </p>
            </div>
            <StaticDueLine lines={SAMPLE_LINES} summary={SAMPLE_SUMMARY} />
          </div>
        </div>
      </section>

      <ChoiceSection />

      <section
        aria-labelledby="made-for-title"
        className="mx-auto flex max-w-[1200px] flex-col gap-9 px-4 py-20 md:px-6 md:py-28"
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2
            id="made-for-title"
            className="max-w-[760px] font-heading text-[40px] leading-[1.06] font-extrabold tracking-[-1.2px] md:text-[52px] md:tracking-[-1.6px]"
          >
            Made for how Indian freelancers get paid.
          </h2>
          <SitePill href="/how-it-works" variant="secondary" small className="px-6 py-3.5">
            How it works →
          </SitePill>
        </div>
        <ul className="grid gap-[18px] md:grid-cols-3">
          {FEATURES.map((feature) => (
            <li key={feature.title} className="flex">
              <Link
                href={feature.href}
                className="surface lift flex min-h-[250px] w-full flex-col gap-3 p-[30px] text-foreground no-underline [--surface-radius:26px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <IconTile
                  tone={feature.tone}
                  className="size-[52px] rounded-2xl font-heading text-[22px] font-extrabold"
                >
                  {feature.mark}
                </IconTile>
                <span className="font-heading text-[28px] font-extrabold tracking-[-0.6px]">
                  {feature.title}
                </span>
                <span className="text-[17px] leading-relaxed text-muted-foreground">
                  {feature.body}
                </span>
                <span className="mt-auto font-bold text-link">{feature.more} →</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="px-4 pb-20 md:px-6 md:pb-28">
        <div className="mx-auto flex max-w-[1152px] flex-wrap items-center justify-between gap-8 rounded-[36px] bg-navy-band p-8 text-white md:p-16">
          <div className="flex flex-[1_1_520px] flex-col gap-3.5">
            <p className="self-start rounded-full bg-white/14 px-4 py-2 text-sm font-bold">
              Built on PayPal
            </p>
            <h2 className="font-heading text-[36px] leading-[1.06] font-extrabold tracking-[-1.1px] md:text-[52px] md:tracking-[-1.6px]">
              PayPal moves the money. Dueline makes sure it arrives.
            </h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <SitePill href="/built-on-paypal" variant="white">
              How Dueline uses PayPal
            </SitePill>
            <SitePill href={DEMO_HREF} variant="glass">
              Open the demo
            </SitePill>
          </div>
        </div>
      </section>
    </>
  );
}
