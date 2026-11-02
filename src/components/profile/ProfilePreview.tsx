import { initialsOf, PREVIEW_NAME_PLACEHOLDER, previewDetails } from "./profile-preview";
import type { ProfileFormValues } from "./profile-form";
import { cn } from "@/lib/utils";

export function ProfilePreview({ form }: { form: ProfileFormValues }) {
  const business = form.businessName.trim();

  return (
    <section
      aria-labelledby="preview-title"
      className="surface flex flex-col gap-3 p-6 [--h2-size:20px] [--h2-tracking:-0.2px] [--surface-radius:24px]"
    >
      <h2 id="preview-title">How your invoice header looks</h2>
      <div className="flex items-center gap-3.5 rounded-[18px] border-[1.5px] border-line p-5">
        <span
          aria-hidden="true"
          className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#0b0b0f] font-extrabold text-white ring-1 ring-white/15"
        >
          {initialsOf(form)}
        </span>
        <p className="min-w-0">
          <span
            className={cn(
              "block font-heading text-[22px] leading-tight font-extrabold tracking-[-0.3px] break-words",
              !business && "text-muted-foreground",
            )}
          >
            {business || PREVIEW_NAME_PLACEHOLDER}
          </span>
          <span className="block text-sm break-words text-muted-foreground">
            {previewDetails(form)}
          </span>
        </p>
      </div>
      <p className="text-[13px] text-subtle">
        This is what your client sees at the top of the PayPal invoice.
      </p>
    </section>
  );
}
