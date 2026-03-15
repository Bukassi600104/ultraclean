interface BOLogoProps {
  size?: number;
  color?: string;
  className?: string;
}

export function BOLogo({ size = 52, color = "#160C5A", className = "" }: BOLogoProps) {
  return (
    <svg
      width={size}
      height={Math.round(size * 1.14)}
      viewBox="0 0 88 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Bimbo Oyedotun logo"
    >
      {/* O — outer circle ring */}
      <circle cx="50" cy="64" r="34" stroke={color} strokeWidth="5.5" />

      {/* B — vertical spine, extends slightly above the circle */}
      <line
        x1="26"
        y1="22"
        x2="26"
        y2="98"
        stroke={color}
        strokeWidth="5.5"
        strokeLinecap="round"
      />

      {/* B — upper D-shaped bump */}
      <path
        d="M26 26 C50 26 68 34 68 44 C68 54 50 62 26 62"
        stroke={color}
        strokeWidth="5.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* B — lower D-shaped bump (slightly wider) */}
      <path
        d="M26 62 C54 62 72 70 72 80 C72 90 54 98 26 98"
        stroke={color}
        strokeWidth="5.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
