interface BOLogoProps {
  size?: number;
  color?: string;
  className?: string;
}

/**
 * Bimbo Oyedotun "BO" monogram logotype.
 * Path extracted exactly from the official brand guide PDF.
 * Single filled path, even-odd winding rule — white on navy or navy on white.
 */
export function BOLogo({ size = 52, color = "#160C5A", className = "" }: BOLogoProps) {
  // Original aspect ratio: 430 wide × 490 tall (from PDF path bounds)
  const height = Math.round(size * (490 / 430));
  return (
    <svg
      width={size}
      height={height}
      viewBox="0 0 430 490"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Bimbo Oyedotun logo"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        fill={color}
        d="
          M 146.836 30.298
          L 215.809 30.475
          C 239.012 30.430 256.150 38.255 256.116 61.595
          C 256.053 103.997 200.743 89.766 147.181 92.685
          L 146.977 276.772
          L 176.120 277.256
          L 176.095 121.494
          C 224.841 120.878 252.317 119.890 289.754 142.642
          C 386.558 201.472 388.144 341.836 293.324 402.790
          C 158.914 489.194 0.735 337.206 75.582 201.087
          L 88.460 178.560
          L 66.149 163.271
          C 45.125 183.735 28.284 232.746 27.934 271.815
          C 26.806 397.821 151.648 489.741 272.359 445.984
          C 389.689 403.452 429.537 259.094 355.866 163.810
          C 317.251 113.868 280.648 108.683 271.659 100.784
          C 279.885 87.555 288.011 75.273 284.900 53.045
          C 279.212 12.406 246.650 1.414 210.458 1.463
          L 147.108 1.753
          Z
        "
      />
    </svg>
  );
}
