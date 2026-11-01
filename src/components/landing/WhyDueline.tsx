import { FileSpreadsheet, IndianRupee, Radar, type LucideIcon } from "lucide-react";

interface Feature {
  icon: LucideIcon;
  title: string;
  text: string;
}

const FEATURES: Feature[] = [
  {
    icon: IndianRupee,
    title: "Rupee truth",
    text: "See what will reach your bank in rupees before you send an invoice, and PayPal's own fee and net once it is paid.",
  },
  {
    icon: Radar,
    title: "Late-payer radar",
    text: "Clients who habitually pay late are scored from their history, with an early-payment discount you can offer through PayPal.",
  },
  {
    icon: FileSpreadsheet,
    title: "Export pack",
    text: "A suggested RBI purpose code on each invoice, an optional LUT line, and a monthly register to match PayPal's FIRA.",
  },
];

export function WhyDueline() {
  return (
    <section aria-labelledby="why-title" className="px-4 py-16">
      <div className="mx-auto w-full max-w-6xl">
        <h2 id="why-title" className="text-3xl font-semibold">
          Why Dueline
        </h2>
        <ul className="mt-8 grid gap-6 md:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <li key={title} className="rounded-xl border border-line bg-card p-6">
              <Icon aria-hidden="true" className="size-6 text-blue" />
              <h3 className="mt-4 text-xl font-semibold">{title}</h3>
              <p className="mt-2 text-muted-foreground">{text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
