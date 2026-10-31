const REPOSITORY = "https://github.com/rishibhaskar777/dueline";

export function LandingFooter() {
  return (
    <footer className="bg-navy px-4 py-10 text-white/80">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 text-sm">
        <p>
          Built for the PayPal AI Hackathon 2026. Runs on the PayPal sandbox; no real money moves.
        </p>
        <a
          href={REPOSITORY}
          rel="noopener noreferrer"
          className="rounded-md font-medium text-white underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          Dueline on GitHub
        </a>
      </div>
    </footer>
  );
}
