import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

/**
 * Generated Open Graph images (1200×630) for the home and category pages:
 * the brand's dark banner, concentric gold rings and the Cormorant display
 * face (vendored WOFF, SIL OFL — `fonts/OFL.txt`; Satori reads neither
 * WOFF2 nor CSS variables).
 */

/** The light theme's values from `globals.css` (`--gd-banner`, `--gd-gold`, `--gd-gold-soft`). */
export const OG_PALETTE = {
  banner: "#2b2620",
  gold: "#c9a24b",
  goldSoft: "#f6ebd0",
  muted: "#a39882",
} as const;

const FONT_DIR = join(process.cwd(), "src/features/shop/og/fonts");

let fonts: Promise<Array<{ name: string; data: Buffer; weight: 600; style: "normal" }>> | null =
  null;

function loadFonts() {
  fonts ??= Promise.all(
    // One family name per subset: Satori does not fall back between faces
    // that share a name, so Cyrillic (U18) needs its own entry in the stack.
    [
      ["Cormorant", "cormorant-garamond-latin-600-normal.woff"],
      ["CormorantExt", "cormorant-garamond-latin-ext-600-normal.woff"],
      ["CormorantCyr", "cormorant-garamond-cyrillic-600-normal.woff"],
    ].map(async ([name, file]) => ({
      name: name!,
      data: await readFile(join(FONT_DIR, file!)),
      weight: 600 as const,
      style: "normal" as const,
    })),
  ).catch((error: unknown) => {
    fonts = null;
    throw error;
  });
  return fonts;
}

const RINGS: ReadonlyArray<readonly [number, number]> = [
  [150, 0.55],
  [215, 0.38],
  [280, 0.25],
  [345, 0.15],
  [410, 0.08],
];

export async function brandImage(input: {
  eyebrow: string;
  title: string;
  footer: string;
}): Promise<ImageResponse> {
  const titleSize = input.title.length > 60 ? 64 : input.title.length > 34 ? 76 : 92;
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        background: OG_PALETTE.banner,
        fontFamily: "Cormorant, CormorantExt, CormorantCyr",
        overflow: "hidden",
      }}
    >
      <svg
        width="900"
        height="900"
        viewBox="0 0 900 900"
        style={{ position: "absolute", right: -260, top: -135 }}
      >
        {RINGS.map(([r, opacity]) => (
          <circle
            key={r}
            cx="450"
            cy="450"
            r={r}
            fill="none"
            stroke={OG_PALETTE.gold}
            strokeOpacity={opacity}
            strokeWidth="1.5"
          />
        ))}
      </svg>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          width: "100%",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 56, height: 2, background: OG_PALETTE.gold }} />
          <div style={{ fontSize: 30, color: OG_PALETTE.gold, letterSpacing: 4 }}>
            {input.eyebrow.toUpperCase()}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: titleSize,
            lineHeight: 1.02,
            color: OG_PALETTE.goldSoft,
            maxWidth: 860,
          }}
        >
          {input.title}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 24 }}>
          <div style={{ fontSize: 48, color: OG_PALETTE.gold }}>Glow Derma</div>
          <div style={{ fontSize: 28, color: OG_PALETTE.muted }}>{input.footer}</div>
        </div>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      fonts: await loadFonts(),
      headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" },
    },
  );
}
