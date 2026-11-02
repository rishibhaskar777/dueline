import { REPOSITORY_URL } from "@/lib/repository";

export function SiteFooter() {
  return (
    <footer className="border-t border-bar-line">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-7 text-[13px] text-muted-foreground md:px-6">
        <p>
          Dueline · a PayPal AI Hackathon 2026 project. Runs on the PayPal sandbox; no real money
          moves. Not affiliated with PayPal.
        </p>
        <a
          href={REPOSITORY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-link underline underline-offset-2"
        >
          Source on GitHub
        </a>
      </div>
    </footer>
  );
}
