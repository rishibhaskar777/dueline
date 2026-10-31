const PAYPAL_PARTS = [
  "Invoicing v2 to create, send and remind",
  "Payments and Transaction Search for PayPal's real fee and net",
  "Verified webhooks, so a payment shows up as soon as PayPal confirms it",
];

const AI_RULES = [
  "Gemini reads your chat with emails and phone numbers hidden",
  "Every quantity, price, total and date is checked in code",
  "Nothing is sent until you click",
];

function Panel({ id, title, items }: { id: string; title: string; items: string[] }) {
  return (
    <section aria-labelledby={id} className="rounded-xl border border-line bg-white p-6">
      <h3 id={id} className="text-xl font-semibold">
        {title}
      </h3>
      <ul className="mt-4 grid gap-3 text-muted-foreground">
        {items.map((item) => (
          <li key={item} className="flex gap-3">
            <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-blue" />
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function BuiltOnPayPal() {
  return (
    <section aria-labelledby="built-title" className="px-4 py-16">
      <div className="mx-auto w-full max-w-6xl">
        <h2 id="built-title" className="text-3xl font-semibold">
          Built on PayPal
        </h2>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <Panel id="paypal-title" title="What PayPal does" items={PAYPAL_PARTS} />
          <Panel id="ai-title" title="AI that only drafts" items={AI_RULES} />
        </div>
      </div>
    </section>
  );
}
