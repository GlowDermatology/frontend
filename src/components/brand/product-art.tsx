import type { CSSProperties, ReactNode } from "react";

/**
 * Flat product illustrations from the design (there are no product photos in
 * this phase). Each shape belongs to a detail level so the same artwork
 * renders as a table thumbnail, an in-phone card or a catalog hero exactly as
 * drawn on the canvas.
 */
export type ProductArtKind = "pump" | "jar" | "dropper" | "tube" | "toner" | "box" | "texture";

/** Colour variants that appear on the canvas (e.g. the dark retinol bottle). */
export type ProductArtTone = "default" | "night" | "dark-cap";

export type ProductArtDetail = "glyph" | "thumb" | "card" | "full";

const LEVEL: Record<ProductArtDetail, number> = { glyph: 0, thumb: 1, card: 2, full: 3 };

const INK = "#2a2418";

interface Palette {
  cap: string;
  accent: string;
  body: string;
  label: string;
}

const PALETTES: Record<ProductArtKind, Record<ProductArtTone, Palette>> = {
  pump: {
    default: { cap: "#2b2620", accent: "#2b2620", body: "#e9dfca", label: "#ffffff" },
    night: { cap: "#14110d", accent: "#14110d", body: "#d8cdb6", label: "#ffffff" },
    "dark-cap": { cap: "#2b2620", accent: "#2b2620", body: "#e9dfca", label: "#ffffff" },
  },
  jar: {
    default: { cap: "#c9a24b", accent: "#9a7424", body: "#f3eee2", label: "#ffffff" },
    night: { cap: "#2b2620", accent: "#14110d", body: "#e9dfca", label: "#ffffff" },
    "dark-cap": { cap: "#2b2620", accent: "#14110d", body: "#f3eee2", label: "#ffffff" },
  },
  dropper: {
    default: { cap: "#2b2620", accent: "#c9a24b", body: "#a8733a", label: "#fbf8f2" },
    night: { cap: "#14110d", accent: "#c9a24b", body: "#4a3f31", label: "#e9dfca" },
    "dark-cap": { cap: "#14110d", accent: "#c9a24b", body: "#a8733a", label: "#fbf8f2" },
  },
  tube: {
    default: { cap: "#c9a24b", accent: "#e9dfca", body: "#ffffff", label: "#f3eee2" },
    night: { cap: "#2b2620", accent: "#e9dfca", body: "#f3eee2", label: "#e9dfca" },
    "dark-cap": { cap: "#2b2620", accent: "#e9dfca", body: "#f3eee2", label: "#e9dfca" },
  },
  toner: {
    default: { cap: "#2b2620", accent: "#2b2620", body: "#d8cdb6", label: "#ffffff" },
    night: { cap: "#14110d", accent: "#14110d", body: "#a39882", label: "#ffffff" },
    "dark-cap": { cap: "#2b2620", accent: "#2b2620", body: "#d8cdb6", label: "#ffffff" },
  },
  box: {
    default: { cap: "#c9a24b", accent: "#e5dcc8", body: "#f6ebd0", label: "#ffffff" },
    night: { cap: "#c9a24b", accent: "#e5dcc8", body: "#f6ebd0", label: "#ffffff" },
    "dark-cap": { cap: "#2b2620", accent: "#e5dcc8", body: "#f6ebd0", label: "#ffffff" },
  },
  texture: {
    default: { cap: "#ffffff", accent: "#ffffff", body: "#e9dfca", label: "#ffffff" },
    night: { cap: "#ffffff", accent: "#ffffff", body: "#d8cdb6", label: "#ffffff" },
    "dark-cap": { cap: "#ffffff", accent: "#ffffff", body: "#e9dfca", label: "#ffffff" },
  },
};

type Layer = [minLevel: number, node: ReactNode];

function shadow(cx: number, rx: number): Layer {
  return [3, <ellipse key="shadow" cx={cx} cy="151" rx={rx} ry="4" fill={INK} fillOpacity=".12" />];
}

function layers(kind: ProductArtKind, p: Palette): Layer[] {
  switch (kind) {
    case "pump":
      return [
        shadow(61, 28),
        [0, <rect key="n" x="58" y="12" width="32" height="8" rx="4" fill={p.cap} />],
        [0, <rect key="s" x="56" y="14" width="10" height="22" rx="2" fill={p.cap} />],
        [0, <rect key="c" x="49" y="34" width="24" height="14" rx="3" fill={p.cap} />],
        [0, <rect key="b" x="36" y="48" width="50" height="100" rx="18" fill={p.body} />],
        [
          2,
          <rect
            key="h"
            x="42"
            y="58"
            width="6"
            height="78"
            rx="3"
            fill={p.label}
            fillOpacity=".5"
          />,
        ],
        [
          2,
          <rect
            key="l1"
            x="49"
            y="88"
            width="24"
            height="3"
            rx="1.5"
            fill={INK}
            fillOpacity=".6"
          />,
        ],
        [
          2,
          <rect key="l2" x="52" y="96" width="18" height="2" rx="1" fill={INK} fillOpacity=".3" />,
        ],
      ];
    case "jar":
      return [
        shadow(60, 38),
        [0, <rect key="lid" x="24" y="74" width="72" height="22" rx="6" fill={p.cap} />],
        [
          2,
          <rect key="rim" x="26" y="90" width="68" height="4" fill={p.accent} fillOpacity=".45" />,
        ],
        [
          0,
          <rect
            key="b"
            x="27"
            y="94"
            width="66"
            height="54"
            rx="16"
            fill={p.body}
            stroke="#e5dcc8"
          />,
        ],
        [2, <rect key="h" x="33" y="102" width="5" height="36" rx="2.5" fill={p.label} />],
        [
          2,
          <rect
            key="l1"
            x="44"
            y="112"
            width="32"
            height="3"
            rx="1.5"
            fill={INK}
            fillOpacity=".55"
          />,
        ],
        [
          3,
          <rect key="l2" x="48" y="120" width="24" height="2" rx="1" fill={INK} fillOpacity=".3" />,
        ],
      ];
    case "dropper":
      return [
        shadow(60, 30),
        [0, <path key="bulb" d="M52 31c0-10 3.6-17 8-17s8 7 8 17z" fill={p.cap} />],
        [0, <rect key="c" x="47" y="30" width="26" height="18" rx="3" fill={p.accent} />],
        [2, <rect key="r" x="49" y="46" width="22" height="4" fill="#9a7424" />],
        [0, <rect key="b" x="34" y="50" width="52" height="98" rx="13" fill={p.body} />],
        [
          2,
          <rect
            key="h"
            x="40"
            y="58"
            width="6"
            height="80"
            rx="3"
            fill="#ffffff"
            fillOpacity=".28"
          />,
        ],
        [1, <rect key="lab" x="43" y="82" width="34" height="38" rx="3" fill={p.label} />],
        [
          2,
          <rect
            key="l1"
            x="49"
            y="92"
            width="22"
            height="3"
            rx="1.5"
            fill={INK}
            fillOpacity=".6"
          />,
        ],
        [
          3,
          <rect key="l2" x="52" y="100" width="16" height="2" rx="1" fill={INK} fillOpacity=".3" />,
        ],
        [
          3,
          <rect key="l3" x="52" y="106" width="16" height="2" rx="1" fill={INK} fillOpacity=".3" />,
        ],
      ];
    case "tube":
      return [
        shadow(60, 24),
        [0, <rect key="seal" x="34" y="14" width="52" height="9" rx="2" fill={p.accent} />],
        [0, <path key="b" d="M36 22h48l-8 100H44z" fill={p.body} stroke="#e5dcc8" />],
        [2, <rect key="h" x="44" y="30" width="5" height="60" rx="2.5" fill={p.label} />],
        [
          2,
          <rect
            key="l1"
            x="47"
            y="50"
            width="26"
            height="3"
            rx="1.5"
            fill={INK}
            fillOpacity=".6"
          />,
        ],
        [
          2,
          <rect key="l2" x="50" y="58" width="20" height="2" rx="1" fill={INK} fillOpacity=".3" />,
        ],
        [
          2,
          <rect
            key="badge"
            x="51"
            y="74"
            width="18"
            height="12"
            rx="2"
            fill="#c9a24b"
            fillOpacity=".35"
          />,
        ],
        [0, <rect key="cap" x="44" y="120" width="32" height="28" rx="6" fill={p.cap} />],
      ];
    case "toner":
      return [
        shadow(60, 24),
        [0, <rect key="cap" x="48" y="10" width="24" height="28" rx="5" fill={p.cap} />],
        [0, <rect key="b" x="40" y="38" width="40" height="110" rx="12" fill={p.body} />],
        [
          2,
          <rect
            key="h"
            x="45"
            y="46"
            width="5"
            height="92"
            rx="2.5"
            fill={p.label}
            fillOpacity=".5"
          />,
        ],
        [
          2,
          <rect
            key="l1"
            x="48"
            y="86"
            width="24"
            height="3"
            rx="1.5"
            fill={INK}
            fillOpacity=".6"
          />,
        ],
        [
          2,
          <rect key="l2" x="51" y="94" width="18" height="2" rx="1" fill={INK} fillOpacity=".3" />,
        ],
      ];
    case "box":
      return [
        [
          0,
          <rect
            key="b"
            x="30"
            y="20"
            width="60"
            height="128"
            rx="6"
            fill={p.body}
            stroke={p.accent}
          />,
        ],
        [
          0,
          <rect key="l1" x="40" y="60" width="40" height="4" rx="2" fill={INK} fillOpacity=".55" />,
        ],
        [
          0,
          <rect
            key="l2"
            x="45"
            y="70"
            width="30"
            height="3"
            rx="1.5"
            fill={INK}
            fillOpacity=".3"
          />,
        ],
        [0, <rect key="seal" x="50" y="110" width="20" height="20" rx="10" fill={p.cap} />],
      ];
    case "texture":
      return [
        [0, <ellipse key="b" cx="60" cy="64" rx="36" ry="22" fill={p.body} />],
        [0, <ellipse key="h" cx="54" cy="58" rx="14" ry="7" fill={p.label} fillOpacity=".7" />],
      ];
  }
}

export interface ProductArtProps {
  kind: ProductArtKind;
  tone?: ProductArtTone;
  detail?: ProductArtDetail;
  /** Rendered width in px; height follows the artwork's aspect ratio. */
  width: number;
  /** Accessible name; omit for decorative use. */
  label?: string;
  className?: string;
  style?: CSSProperties;
}

export function ProductArt({
  kind,
  tone = "default",
  detail = "full",
  width,
  label,
  className,
  style,
}: ProductArtProps) {
  const square = kind === "texture";
  const level = LEVEL[detail];
  const shapes = layers(kind, PALETTES[kind][tone])
    .filter(([min]) => min <= level)
    .map(([, node]) => node);

  return (
    <svg
      viewBox={square ? "0 0 120 120" : "0 0 120 160"}
      width={width}
      height={square ? width : Math.round((width * 160) / 120)}
      className={className}
      style={style}
      focusable="false"
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    >
      {shapes}
    </svg>
  );
}
