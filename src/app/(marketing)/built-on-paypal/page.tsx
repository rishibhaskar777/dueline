import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { CtaBand } from "@/components/site/CtaBand";
import {
  cardDelay,
  cardHighlightKeyframes,
  flowCycle,
  railDelay,
} from "@/components/site/flow-timing";
import { PageIntro } from "@/components/site/PageIntro";

export const metadata: Metadata = {
  title: "Built on PayPal",
  description:
    "Dueline creates and sends invoices with PayPal Invoicing, reads real fees from PayPal, and acts only on webhooks PayPal has verified. Everything runs on the PayPal sandbox.",
};

const FLOW = [
  { title: "Dueline", body: "Creates and sends the invoice through PayPal." },
  { title: "Your client", body: "Pays on PayPal’s page, by card or PayPal balance." },
  { title: "PayPal", body: "Sends a signed webhook. Dueline checks the signature." },
  { title: "Your rupees", body: "Real fee and net amount, from PayPal’s own records." },
];

const APIS = [
  {
    tag: "Invoicing v2",
    title: "Create, send, remind",
    body: "Every invoice is a real PayPal invoice, with your GSTIN, LUT and SAC printed on it.",
  },
  {
    tag: "Transactions",
    title: "The real fee",
    body: "After payment, Dueline reads the actual fee and net from PayPal instead of guessing.",
  },
  {
    tag: "Webhooks",
    title: "Verified events",
    body: "Paid and cancelled events are checked with PayPal before anything changes.",
  },
];

const AI_RULES = [
  "Gemini reads your chat with emails and phone numbers hidden",
  "Every quantity, price, total and date is checked in code",
  "Nothing is sent until you click",
];

export default function BuiltOnPayPalPage() {
  return (
    <>
      <PageIntro chip="Built on PayPal" title="PayPal moves the money. Dueline does the rest.">
        Your client pays on PayPal’s own page. Dueline reads the result and never touches a card or
        bank account.
      </PageIntro>
      <div className="mx-auto flex max-w-[1152px] flex-col gap-[22px] px-4 pb-20 md:px-6 md:pb-24">
        <section
          aria-labelledby="flow-title"
          className="surface flex flex-col gap-6 p-6 md:p-10 [--h2-size:30px] [--surface-radius:30px]"
        >
          <h2 id="flow-title">How a payment reaches Dueline</h2>
          <style>{cardHighlightKeyframes()}</style>
          <ol
            className="flex flex-col gap-3 [--rail-gap:36px] md:grid md:grid-cols-4 md:gap-x-(--rail-gap) lg:[--rail-gap:72px]"
            style={{ "--flow-cycle": flowCycle() } as CSSProperties}
          >
            {FLOW.map((step, index) => (
              <li key={step.title} className="relative">
                <div
                  className="dl-flow-card flex h-full w-full flex-col gap-1.5 rounded-[22px] bg-inner p-[18px] shadow-[inset_0_0_0_1px_var(--glass-edge)]"
                  style={{ animationDelay: cardDelay(index) }}
                >
                  <p className="font-heading text-lg font-extrabold">{step.title}</p>
                  <p className="text-sm leading-snug text-muted-foreground">{step.body}</p>
                </div>
                {index < FLOW.length - 1 && (
                  <div
                    aria-hidden="true"
                    className="absolute top-1/2 left-full ml-2 hidden h-0.5 w-[calc(var(--rail-gap)-16px)] -translate-y-1/2 bg-rail md:block"
                  >
                    <span
                      className="dl-flow bg-blue-line"
                      style={{ animationDelay: railDelay(index) }}
                    />
                  </div>
                )}
              </li>
            ))}
          </ol>
        </section>

        <ul className="grid gap-4 md:grid-cols-3">
          {APIS.map((api) => (
            <li
              key={api.tag}
              className="surface flex flex-col gap-3 p-7 [--h2-size:24px] [--h2-tracking:-0.4px] [--surface-radius:30px]"
            >
              <p className="self-start rounded-full bg-chip px-3 py-1.5 text-[13px] font-bold text-blue">
                {api.tag}
              </p>
              <h2>{api.title}</h2>
              <p className="leading-relaxed text-muted-foreground">{api.body}</p>
            </li>
          ))}
        </ul>

        <section
          aria-labelledby="ai-title"
          className="surface flex flex-col gap-3 p-8 [--h2-size:24px] [--surface-radius:30px]"
        >
          <h2 id="ai-title">AI that only drafts</h2>
          <ul className="grid gap-2.5 text-[17px] text-muted-foreground">
            {AI_RULES.map((rule) => (
              <li key={rule} className="flex gap-3">
                <span
                  aria-hidden="true"
                  className="mt-2.5 size-1.5 shrink-0 rounded-full bg-blue"
                />
                {rule}
              </li>
            ))}
          </ul>
        </section>

        <section
          aria-labelledby="reminders-title"
          className="surface flex flex-col gap-2.5 p-8 [--h2-size:24px] [--surface-radius:30px]"
        >
          <h2 id="reminders-title">Two ways to remind a client</h2>
          <p className="text-[17px] leading-relaxed text-muted-foreground">
            PayPal sends its own reminder wording, whatever message we pass. So Nudges gives you two
            buttons: send PayPal’s reminder, or send the message Dueline drafted from your own
            email. You can use both, once a day each.
          </p>
        </section>

        <CtaBand tone="navy" title="Real PayPal sandbox, end to end.">
          The demo runs on PayPal’s sandbox, so you can send and pay real invoices without real
          money.
        </CtaBand>
      </div>
    </>
  );
}
