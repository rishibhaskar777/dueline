import { cn } from "@/lib/utils";
import type { ChoiceCard } from "./landing-choices";

const SHELL =
  "flex flex-col gap-3.5 rounded-[28px] border border-white/15 bg-white/7 p-[30px] text-white backdrop-blur-xl max-md:p-6";

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-t border-white/12 py-3 text-[17px]">
      <span>{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}

function Payout() {
  return (
    <div className={SHELL}>
      <p className="text-[15px] font-semibold text-[#b4bccb]">Invoice 0025 · Tandem Health</p>
      <p className="font-heading text-[52px] leading-none font-extrabold tracking-[-1.4px] max-md:text-[44px]">
        $900.00
      </p>
      <div>
        <Line label="PayPal fee" value="− $39.90" />
        <Line label="Conversion loss" value="− ₹2,450" />
      </div>
      <p className="flex items-baseline justify-between gap-3 rounded-[18px] bg-[rgba(91,155,255,0.18)] px-5 py-4">
        <span className="font-bold">Reaches your bank</span>
        <span className="font-heading text-[30px] font-extrabold text-[#b8d2ff]">₹79,221</span>
      </p>
    </div>
  );
}

function Radar() {
  return (
    <div className={SHELL}>
      <p className="text-[15px] font-semibold text-[#b4bccb]">Late-payer radar</p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-heading text-[34px] leading-tight font-extrabold tracking-[-0.8px]">
          Okafor &amp; Reyes
        </p>
        <span className="rounded-full bg-[rgba(255,107,97,0.18)] px-3 py-1.5 text-[13px] font-bold text-[#ff8a80]">
          Late payer
        </span>
      </div>
      <p className="text-[17px]">Late on 3 of 3 invoices, 14 days on average.</p>
      <div className="flex items-center justify-between gap-3 border-t border-white/12 pt-3.5 text-[17px]">
        <span>Reminder tone</span>
        <span className="rounded-full bg-[rgba(245,165,36,0.18)] px-3 py-1.5 text-[13px] font-bold text-[#ffc266]">
          Firm
        </span>
      </div>
      <p className="rounded-[18px] bg-[rgba(91,155,255,0.18)] px-5 py-4 font-bold text-[#b8d2ff]">
        Offer 2% if paid within 7 days
      </p>
    </div>
  );
}

const PROOFS = {
  fira: { text: "PayPal FIRA", style: "bg-[rgba(91,155,255,0.18)] text-[#8fb8ff]" },
  firc: { text: "Bank FIRC added", style: "bg-[rgba(52,194,122,0.18)] text-[#6fdba0]" },
  missing: { text: "Bank, number missing", style: "bg-[rgba(245,165,36,0.18)] text-[#ffc266]" },
} as const;

const REGISTER_ROWS = [
  { client: "Tandem Health", inr: "₹79,049", proof: PROOFS.fira },
  { client: "Brightwell Labs", inr: "₹44,505", proof: PROOFS.firc },
  { client: "Okafor & Reyes", inr: "₹48,089", proof: PROOFS.missing },
];

function Register() {
  return (
    <div className={SHELL}>
      <p className="text-[15px] font-semibold text-[#b4bccb]">October 2026 register</p>
      <ul>
        {REGISTER_ROWS.map((row) => (
          <li
            key={row.client}
            className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-t border-white/12 py-3.5 first:border-t-0"
          >
            <span>
              <span className="block font-bold">{row.client}</span>
              <span className="text-sm text-[#b4bccb]">P1099 · {row.inr}</span>
            </span>
            <span className={cn("rounded-full px-3 py-1.5 text-[13px] font-bold", row.proof.style)}>
              {row.proof.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ChoiceCardView({ card }: { card: ChoiceCard }) {
  if (card === "payout") return <Payout />;
  if (card === "radar") return <Radar />;
  return <Register />;
}
