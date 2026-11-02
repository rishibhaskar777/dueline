import type { Metadata } from "next";
import { PageIntro } from "@/components/site/PageIntro";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "For your CA",
  description:
    "A monthly export register with purpose codes, LUT, transaction IDs and bank FIRC numbers, matched to PayPal's FIRA, plus GSTR-1 rows and a 44ADA year summary.",
};

type Proof = "fira" | "firc" | "missing";

const PROOF_STYLE: Record<Proof, string> = {
  fira: "bg-tint-blue text-blue",
  firc: "bg-tint-green text-paid",
  missing: "bg-tint-amber text-due-soon",
};

const ROWS: {
  date: string;
  client: string;
  amount: string;
  inr: string;
  proof: Proof;
  text: string;
}[] = [
  {
    date: "2 Oct",
    client: "Brightwell Labs",
    amount: "£350.00",
    inr: "₹44,505",
    proof: "firc",
    text: "Bank FIRC/2026/001",
  },
  {
    date: "17 Oct",
    client: "Okafor & Reyes",
    amount: "€450.00",
    inr: "₹48,089",
    proof: "missing",
    text: "Bank, number missing",
  },
  {
    date: "30 Oct",
    client: "Tandem Health",
    amount: "$900.00",
    inr: "₹79,049",
    proof: "fira",
    text: "PayPal FIRA",
  },
];

const POINTS = [
  {
    title: "Matches PayPal’s FIRA",
    body: "PayPal issues one digital FIRA a month by the 15th. The register lists the same payments with transaction IDs, so totals line up.",
  },
  {
    title: "Bank transfers too",
    body: "Payments outside PayPal sit in their own section with the bank’s FIRC or e-BRC number, so nothing is left out.",
  },
  {
    title: "GST-ready",
    body: "GSTIN, LUT ARN with validity, SAC per line and place of supply on every invoice, plus GSTR-1 export rows.",
  },
  {
    title: "Year summary under 44ADA",
    body: "Receipts for the financial year in one view, for presumptive taxation. A starting point for your CA.",
  },
];

const CELL = "px-2.5 py-3.5";
const HEAD = "px-2.5 py-2.5 text-left text-sm font-semibold text-muted-foreground";

export default function ForYourCaPage() {
  return (
    <>
      <PageIntro chip="For your CA" title="A register your CA can work with.">
        Every export payment in one monthly file, matched to the proof the bank or PayPal gives you.
      </PageIntro>
      <div className="mx-auto flex max-w-[1152px] flex-col gap-[22px] px-4 pb-20 md:px-6 md:pb-24">
        <section
          aria-labelledby="register-title"
          className="surface flex flex-col gap-4 p-6 md:p-8 [--h2-size:30px] [--surface-radius:30px]"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2.5">
            <h2 id="register-title">October 2026 register</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[15px]">
              <caption className="pb-3 text-left text-[15px] text-muted-foreground">
                Sample rows from the demo
              </caption>
              <thead>
                <tr>
                  <th scope="col" className={HEAD}>
                    Paid on
                  </th>
                  <th scope="col" className={HEAD}>
                    Client
                  </th>
                  <th scope="col" className={cn(HEAD, "text-right")}>
                    Amount
                  </th>
                  <th scope="col" className={cn(HEAD, "text-right")}>
                    Rupees
                  </th>
                  <th scope="col" className={HEAD}>
                    Code
                  </th>
                  <th scope="col" className={HEAD}>
                    Proof
                  </th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => (
                  <tr key={row.client} className="border-t border-bar-line">
                    <td className={cn(CELL, "whitespace-nowrap")}>{row.date}</td>
                    <td className={cn(CELL, "font-semibold whitespace-nowrap")}>{row.client}</td>
                    <td className={cn(CELL, "text-right tabular-nums")}>{row.amount}</td>
                    <td className={cn(CELL, "text-right tabular-nums")}>{row.inr}</td>
                    <td className={CELL}>P1099</td>
                    <td className={CELL}>
                      <span
                        className={cn(
                          "rounded-full px-3 py-1.5 text-[13px] font-bold whitespace-nowrap",
                          PROOF_STYLE[row.proof],
                        )}
                      >
                        {row.text}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <ul className="grid gap-4 md:grid-cols-2">
          {POINTS.map((point) => (
            <li
              key={point.title}
              className="surface flex flex-col gap-2.5 p-[30px] [--h2-size:26px] [--h2-tracking:-0.4px] [--surface-radius:30px]"
            >
              <h2 className="font-heading text-[26px] font-extrabold tracking-[-0.4px]">
                {point.title}
              </h2>
              <p className="text-[17px] leading-relaxed text-muted-foreground">{point.body}</p>
            </li>
          ))}
        </ul>

        <p className="mt-1.5 text-center text-sm text-muted-foreground">
          Purpose codes are suggestions and GSTR-1 values use the ECB rate; your CA confirms both.
        </p>
      </div>
    </>
  );
}
