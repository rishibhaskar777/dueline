// The page's animated background. Colours come from CSS variables, so the theme switch needs no
// script; the motion is in globals.css and stops under reduced motion.
export function Backdrop() {
  return (
    <div aria-hidden="true" className="dl-backdrop">
      <span className="dl-aurora dl-aurora-1" />
      <span className="dl-aurora dl-aurora-2" />
      <span className="dl-aurora dl-aurora-3" />
      <span className="dl-aurora dl-aurora-4" />
      <span className="dl-dots" />
      <svg className="dl-grain" width="100%" height="100%">
        <filter id="dl-grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.85"
            numOctaves="2"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#dl-grain)" />
      </svg>
    </div>
  );
}
