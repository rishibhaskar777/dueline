const STEPS = [
  {
    title: "Paste the chat",
    text: "Paste what your client wrote. Dueline drafts the invoice and shows where each line came from.",
  },
  {
    title: "Review and send through PayPal",
    text: "You check every number, then send. PayPal delivers the invoice and takes the payment.",
  },
  {
    title: "Track the due line and nudge",
    text: "Watch each invoice run from sent to paid, and approve a polite reminder when one is late.",
  },
  {
    title: "Hand the register to your CA",
    text: "Download the month's export register with purpose codes, ready to match PayPal's FIRA.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" aria-labelledby="how-title" className="scroll-mt-4 bg-card px-4 py-16">
      <div className="mx-auto w-full max-w-6xl">
        <h2 id="how-title" className="text-3xl font-semibold">
          How it works
        </h2>
        <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ title, text }, index) => (
            <li key={title}>
              <span
                aria-hidden="true"
                className="font-heading text-4xl font-semibold tabular-nums text-blue"
              >
                {index + 1}
              </span>
              <h3 className="mt-2 text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-muted-foreground">{text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
