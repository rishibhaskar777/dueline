export function Wordmark() {
  return (
    <span className="flex items-center gap-2.5">
      <svg width="32" height="24" viewBox="0 0 32 24" role="img" aria-label="Dueline">
        <line
          x1="2"
          y1="12"
          x2="30"
          y2="12"
          className="stroke-white"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <line
          x1="21"
          y1="3"
          x2="21"
          y2="21"
          className="stroke-blue-light"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      </svg>
      <span
        aria-hidden="true"
        className="font-heading text-xl font-semibold tracking-tight text-white"
      >
        Dueline
      </span>
    </span>
  );
}
