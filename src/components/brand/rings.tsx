import type { CSSProperties } from "react";

/** [radius, opacity] pairs, inner to outer, in viewBox units. */
export type RingSpec = ReadonlyArray<readonly [radius: number, opacity: number]>;

interface RingsProps {
  /** Side of the square viewBox; rings are centred in it. */
  viewBox: number;
  rings: RingSpec;
  strokeWidth?: number;
  className?: string;
  style?: CSSProperties;
}

/** The brand's concentric gold rings ("like a jar lid"), always decorative. */
export function Rings({ viewBox, rings, strokeWidth = 1.25, className, style }: RingsProps) {
  const c = viewBox / 2;
  return (
    <svg
      viewBox={`0 0 ${viewBox} ${viewBox}`}
      aria-hidden="true"
      focusable="false"
      className={className}
      style={{ pointerEvents: "none", ...style }}
    >
      <g fill="none" strokeWidth={strokeWidth} className="stroke-gold">
        {rings.map(([r, opacity]) => (
          <circle key={r} cx={c} cy={c} r={r} strokeOpacity={opacity} />
        ))}
      </g>
    </svg>
  );
}
