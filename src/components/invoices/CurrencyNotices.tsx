"use client";

import type { InvoiceForm } from "@/components/invoices/invoice-form";
import { NOTICE_CLASSES } from "@/components/invoices/notice-pills";
import { Button } from "@/components/ui/button";
import { currencyNotices } from "@/lib/invoices/chat-currency";
import { cn } from "@/lib/utils";

interface CurrencyNoticesProps {
  chat: string | null;
  form: InvoiceForm;
  update: (changes: Partial<InvoiceForm>) => void;
}

// Compares the chat's money words with the currency on the form each time either changes. The
// currency is never switched here: the button does it, on a click.
export function CurrencyNotices({ chat, form, update }: CurrencyNoticesProps) {
  if (!chat) return null;
  const notices = currencyNotices(chat, form.currency, form.clientCountry);
  if (notices.length === 0) return null;

  return (
    <section aria-label="Check the currency">
      <ul className="flex flex-wrap gap-2.5">
        {notices.map(({ text, suggest }) => (
          <li
            key={text}
            className={cn(
              "flex flex-wrap items-center gap-3 rounded-full py-2 pr-2.5 pl-4 text-[15px] font-semibold",
              NOTICE_CLASSES.amber,
              !suggest && "pr-4",
            )}
          >
            {text}
            {suggest && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => update({ currency: suggest })}
              >
                Use {suggest}
              </Button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
