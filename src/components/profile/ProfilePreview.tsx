import type { ProfileFormValues } from "./profile-form";

function Line({ value, placeholder }: { value: string; placeholder?: string }) {
  if (!value && !placeholder) return null;
  return <p className={value ? undefined : "text-muted-foreground"}>{value || placeholder}</p>;
}

export function ProfilePreview({ form }: { form: ProfileFormValues }) {
  const name = form.yourName.trim();
  const business = form.businessName.trim();
  const gstin = form.gstin.trim();
  const website = form.website.trim();

  return (
    <section aria-labelledby="preview-title" className="rounded-xl border border-line bg-card p-6">
      <h2 id="preview-title" className="text-xl font-semibold">
        How your invoice header will look
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        This is what your client sees at the top of the PayPal invoice.
      </p>
      <div className="mt-5 rounded-lg border border-line bg-ground p-4 text-sm">
        <p className={business ? "text-lg font-semibold" : "text-lg text-muted-foreground"}>
          {business || "Your business name"}
        </p>
        <Line value={name} placeholder="Your name" />
        <Line value={gstin ? `GSTIN ${gstin}` : ""} />
        <Line value={website} />
      </div>
    </section>
  );
}
