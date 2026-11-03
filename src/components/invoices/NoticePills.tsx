import type { PaymentTerms } from "@/types";
import { cn } from "@/lib/utils";
import { NOTICE_CLASSES, noticePills } from "./notice-pills";

interface NoticePillsProps {
  notice: string | null;
  warnings: string[];
  paymentTerms: PaymentTerms | null;
}

export function NoticePills({ notice, warnings, paymentTerms }: NoticePillsProps) {
  const pills = noticePills(notice, warnings, paymentTerms);
  if (pills.length === 0) return null;
  return (
    <section aria-label="Notes on this draft">
      {warnings.length > 0 && <h2 className="sr-only">Check these before you send</h2>}
      <ul className="flex flex-wrap gap-2.5">
        {pills.map(({ text, tone }) => (
          <li
            key={text}
            className={cn(
              "rounded-full px-4 py-2.5 text-[15px] font-semibold",
              NOTICE_CLASSES[tone],
            )}
          >
            {text}
          </li>
        ))}
      </ul>
    </section>
  );
}
