import type { Metadata } from "next";
import { IconTile, type TileTone } from "@/components/shared/IconTile";
import { CtaBand } from "@/components/site/CtaBand";
import { PageIntro } from "@/components/site/PageIntro";

export const metadata: Metadata = {
  title: "Features",
  description:
    "Invoices drafted from a chat, reminders in your client’s language, rupee truth, a cash forecast, a late-payer radar, reminders in the right tone, purpose codes and a register that matches PayPal's FIRA and your bank's FIRC.",
};

interface Group {
  title: string;
  tone: TileTone;
  items: { mark: string; title: string; body: string }[];
}

const GROUPS: Group[] = [
  {
    title: "Draft in seconds",
    tone: "amber",
    items: [
      {
        mark: "→",
        title: "Chat to invoice",
        body: "Paste a WhatsApp or email chat. The AI drafts every line and quotes the words it came from; every number is checked in code.",
      },
      {
        mark: "7",
        title: "Seven languages",
        body: "Reminders drafted in English, Hindi, German, French, Spanish, Dutch or Portuguese, with a tone check before you send.",
      },
      {
        mark: "+",
        title: "Your item library",
        body: "Save lines you bill often and add them in one click.",
      },
      {
        mark: "½",
        title: "Deposit and balance",
        body: "Ask for part upfront. A deposit invoice goes out now and the balance waits as a draft that you send on delivery.",
      },
    ],
  },
  {
    title: "Know your rupees",
    tone: "blue",
    items: [
      {
        mark: "₹",
        title: "Rupee truth",
        body: "What reaches your bank after PayPal’s fee and conversion, before you send, and PayPal’s own figures after.",
      },
      {
        mark: "30",
        title: "Cash forecast",
        body: "Rupees expected in the next 30, 60 and 90 days, weighted by each client’s history.",
      },
      {
        mark: "%",
        title: "Fees lost this year",
        body: "Fees and conversion loss in rupees for the financial year, and per ₹100 received.",
      },
      {
        mark: "€",
        title: "Currency check",
        body: "Warns when the chat says euros and the invoice says dollars. It only asks; you decide whether to switch.",
      },
    ],
  },
  {
    title: "Spot late payers",
    tone: "red",
    items: [
      {
        mark: "!",
        title: "Late-payer radar",
        body: "Every client scored from their history, with the reason in plain words.",
      },
      {
        mark: "↗",
        title: "Nudges in the right tone",
        body: "Reminders drafted firmer for late payers. Send PayPal’s reminder, your own email, or both.",
      },
      {
        mark: "—",
        title: "The due line",
        body: "Each invoice as a line from sent to paid, so the late ones stand out at a glance.",
      },
    ],
  },
  {
    title: "Stay export-ready",
    tone: "green",
    items: [
      {
        mark: "RBI",
        title: "Purpose codes",
        body: "A suggested RBI purpose code on every invoice, kept private from your client.",
      },
      {
        mark: "GST",
        title: "GSTIN, LUT and SAC",
        body: "Printed on every invoice, with GSTR-1 rows and a 44ADA year summary for your CA.",
      },
      {
        mark: "✓",
        title: "FIRA and FIRC matching",
        body: "A monthly register for PayPal’s FIRA, plus bank transfers with their FIRC number.",
      },
      {
        mark: "PDF",
        title: "Printable GST invoice",
        body: "An A4 tax invoice with your GSTIN, SAC, place of supply and the export endorsement, saved as a PDF from your browser.",
      },
    ],
  },
];

export default function FeaturesPage() {
  return (
    <>
      <PageIntro chip="Features" title="Everything after you hit send.">
        Built around one question every freelancer paid from abroad asks: how much will actually
        reach my bank, and when?
      </PageIntro>
      <div className="mx-auto flex max-w-[1152px] flex-col gap-10 px-4 pb-20 md:px-6 md:pb-24">
        {GROUPS.map((group) => (
          <section key={group.title} className="flex flex-col gap-[18px]">
            <h2 className="font-heading text-[30px] font-extrabold tracking-[-0.8px] md:text-4xl">
              {group.title}
            </h2>
            <ul className="grid gap-4 md:grid-cols-3">
              {group.items.map((item) => (
                <li
                  key={item.title}
                  className="surface lift flex min-h-[210px] flex-col gap-3 p-7 [--surface-radius:26px]"
                >
                  <IconTile
                    tone={group.tone}
                    className="size-12 rounded-[15px] font-heading text-xl font-extrabold"
                  >
                    {item.mark}
                  </IconTile>
                  <h3 className="font-heading text-2xl font-extrabold tracking-[-0.4px]">
                    {item.title}
                  </h3>
                  <p className="leading-relaxed text-muted-foreground">{item.body}</p>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <CtaBand tone="black" title="See them with real sandbox invoices." />
      </div>
    </>
  );
}
