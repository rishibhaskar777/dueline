import { cn } from "@/lib/utils";

interface WordmarkProps {
  // "inverse" is for the navy areas, where the text is white whatever the theme.
  tone?: "default" | "inverse";
  // Extra classes for the word, e.g. to hide it where space is short. The mark keeps the name.
  textClassName?: string;
}

export function Wordmark({ tone = "default", textClassName }: WordmarkProps) {
  return (
    <span className="flex items-center gap-2.5">
      <svg width="32" height="32" viewBox="0 0 34 34" role="img" aria-label="Dueline">
        <rect width="34" height="34" rx="10" fill="#0a2a7a" />
        <path d="M7 21h14" stroke="#7cc8ff" strokeWidth="3" strokeLinecap="round" />
        <circle cx="25" cy="21" r="3.5" fill="#ffffff" />
        <path d="M25 9v6" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
      <span
        aria-hidden="true"
        className={cn(
          "font-heading text-[22px] font-extrabold tracking-[-0.5px]",
          tone === "inverse" ? "text-white" : "text-foreground",
          textClassName,
        )}
      >
        Dueline
      </span>
    </span>
  );
}
