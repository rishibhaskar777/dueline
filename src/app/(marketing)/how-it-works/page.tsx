import type { Metadata } from "next";
import { CtaBand } from "@/components/site/CtaBand";
import { PageIntro } from "@/components/site/PageIntro";
import {
  HOW_IT_WORKS_PAYOUT,
  SAMPLE_INVOICE_TOTAL,
  SAMPLE_ITEMS,
  sampleItemTotal,
} from "@/components/site/sample-payouts";
import { formatMoney } from "@/lib/money/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "From a pasted client chat to rupees in your bank, in four steps: draft, check and send through PayPal, nudge, and hand the register to your CA.",
};

type RowKind = "bubble" | "mine" | "line" | "late" | "ok";

interface Row {
  kind: RowKind;
  left: string;
  right?: string;
}

interface Step {
  title: string;
  body: string;
  rows: Row[];
}

const STEPS: Step[] = [
  {
    title: "Paste the chat",
    body: "Copy what your client wrote, from email, WhatsApp or anywhere. Emails and phone numbers are hidden before the AI reads it, and every line it drafts quotes the words it came from.",
    rows: [
      {
        kind: "bubble",
        left: "Maya: 3 social media templates at €120 each, plus one newsletter layout for €250?",
      },
      { kind: "mine", left: "Riya: Sure, I’ll deliver by Friday." },
      ...SAMPLE_ITEMS.map((item): Row => ({
        kind: "line",
        left: `Drafted: ${item.quantity} × ${item.name}`,
        right: formatMoney({ currency: "EUR", value: sampleItemTotal(item) }),
      })),
    ],
  },
  {
    title: "Check it and send through PayPal",
    body: "You see every number, the RBI purpose code, the LUT line and what will reach your bank after PayPal’s fee and conversion. Nothing is sent until you click.",
    rows: [
      {
        kind: "line",
        left: "Invoice total",
        right: formatMoney({ currency: "EUR", value: SAMPLE_INVOICE_TOTAL }),
      },
      { kind: "line", left: "PayPal fee", right: HOW_IT_WORKS_PAYOUT.fee },
      { kind: "line", left: "Currency conversion", right: HOW_IT_WORKS_PAYOUT.conversion },
      { kind: "line", left: "Total lost", right: HOW_IT_WORKS_PAYOUT.total },
      { kind: "line", left: "About this reaches your bank", right: HOW_IT_WORKS_PAYOUT.bank },
    ],
  },
  {
    title: "Watch the due line, then nudge",
    body: "Every invoice runs from sent to paid. When one is late, Dueline drafts a reminder in the right tone. Send PayPal’s reminder, your own email, or both.",
    rows: [
      { kind: "late", left: "Okafor & Reyes · 0019", right: "8 days late" },
      { kind: "line", left: "Suggested tone", right: "Firm" },
      { kind: "ok", left: "PayPal reminder", right: "Sent 2 Nov" },
    ],
  },
  {
    title: "Hand the register to your CA",
    body: "Each month, one CSV with purpose codes, LUT, transaction IDs and bank FIRC numbers, ready to match PayPal’s FIRA.",
    rows: [
      { kind: "line", left: "October 2026 · 5 payments", right: "₹2,15,754" },
      { kind: "line", left: "On PayPal’s FIRA", right: "₹79,049" },
      { kind: "line", left: "By bank transfer", right: "₹1,36,705" },
    ],
  },
];

const ROW_STYLE: Record<RowKind, string> = {
  bubble: "rounded-[18px] bg-chip px-4 py-3.5 text-[15px]",
  mine: "rounded-[18px] bg-tint-blue px-4 py-3.5 text-[15px]",
  line: "border-b border-bar-line py-3 text-base",
  late: "border-b border-bar-line py-3 text-base text-late",
  ok: "border-b border-bar-line py-3 text-base text-paid",
};

export default function HowItWorksPage() {
  return (
    <>
      <PageIntro chip="How it works" title="From a chat to rupees in four steps.">
        You stay in control at every step. PayPal handles the payment; Dueline handles everything
        around it.
      </PageIntro>
      <div className="mx-auto flex max-w-[1152px] flex-col gap-[22px] px-4 pb-20 md:px-6 md:pb-24">
        <ol className="flex flex-col gap-[22px]">
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className="surface flex flex-wrap items-center gap-9 p-6 md:p-10 [--h2-size:32px] [--h2-tracking:-1px] md:[--h2-size:44px] md:[--h2-tracking:-1.2px] [--surface-radius:32px]"
            >
              <div className="flex flex-[1_1_380px] flex-col gap-3.5">
                <p className="font-heading text-xl font-extrabold text-blue">Step {index + 1}</p>
                <h2 className="font-heading text-[32px] leading-[1.08] font-extrabold tracking-[-1px] md:text-[44px] md:tracking-[-1.2px]">
                  {step.title}
                </h2>
                <p className="text-lg leading-relaxed text-muted-foreground">{step.body}</p>
              </div>
              <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-3 rounded-3xl bg-inner p-6 shadow-[inset_0_0_0_1px_var(--glass-edge)]">
                {step.rows.map((row) => (
                  <p
                    key={row.left}
                    className={cn("flex justify-between gap-3", ROW_STYLE[row.kind])}
                  >
                    <span>{row.left}</span>
                    {row.right && <span className="font-bold">{row.right}</span>}
                  </p>
                ))}
              </div>
            </li>
          ))}
        </ol>
        <CtaBand tone="navy" title="Try it with the sample clients." />
      </div>
    </>
  );
}
