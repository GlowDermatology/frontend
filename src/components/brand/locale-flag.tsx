import type { Locale } from "@/lib/i18n/locales";
import { cn } from "@/lib/cn";

/**
 * The flag of a site/admin language as a small inline SVG (no asset, no external request, CSP
 * friendly): Uzbekistan for `uz`, Russia for `ru`, the United Kingdom for `en`. Decorative — the
 * language name next to it carries the meaning — so it is hidden from assistive technology.
 * Simplified for 16–32px: the Uzbek stars are dots, the Union Jack's counterchange is centred.
 * Sized by `className` (default 24 × 16, 3:2); the rounded corners and the hairline ring keep the
 * white stripes visible on ivory surfaces.
 */
export function LocaleFlag({ locale, className }: { locale: Locale; className?: string }) {
  return (
    <svg
      viewBox="0 0 30 20"
      aria-hidden="true"
      focusable="false"
      className={cn(
        "h-4 w-6 shrink-0 overflow-hidden rounded-[3px] shadow-[0_0_0_1px_rgb(42_31_23/0.12)]",
        className,
      )}
      preserveAspectRatio="xMidYMid slice"
    >
      {locale === "uz" ? <Uzbekistan /> : locale === "ru" ? <Russia /> : <UnitedKingdom />}
    </svg>
  );
}

/** Blue, white and green bands with red fimbriation; crescent and twelve stars (3 · 4 · 5). */
function Uzbekistan() {
  // Right-aligned rows of 3, 4 and 5 stars next to the crescent.
  const stars: Array<[number, number]> = [];
  for (let row = 0; row < 3; row += 1) {
    const count = 3 + row;
    for (let i = 0; i < count; i += 1)
      stars.push([(144 - (count - 1 - i) * 16) / 10, (16 + row * 16) / 10]);
  }
  return (
    <>
      <rect width="30" height="20" fill="#ffffff" />
      <rect width="30" height="6.4" fill="#0099b5" />
      <rect y="13.6" width="30" height="6.4" fill="#1eb53a" />
      <rect y="6.4" width="30" height="0.45" fill="#ce1126" />
      <rect y="13.15" width="30" height="0.45" fill="#ce1126" />
      <circle cx="4.4" cy="3.2" r="2.2" fill="#ffffff" />
      <circle cx="5.2" cy="3.2" r="1.85" fill="#0099b5" />
      {stars.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="0.42" fill="#ffffff" />
      ))}
    </>
  );
}

/** White, blue and red horizontal thirds. */
function Russia() {
  return (
    <>
      <rect width="30" height="20" fill="#ffffff" />
      <rect y="6.667" width="30" height="6.667" fill="#0039a6" />
      <rect y="13.333" width="30" height="6.667" fill="#d52b1e" />
    </>
  );
}

/** The Union Jack on a 3:2 field (blue ground, saltires, the cross of St George). */
function UnitedKingdom() {
  return (
    <>
      <rect width="30" height="20" fill="#012169" />
      <path d="M0 0 30 20M30 0 0 20" stroke="#ffffff" strokeWidth="4" />
      <path d="M0 0 30 20M30 0 0 20" stroke="#c8102e" strokeWidth="1.4" />
      <path d="M15 0v20M0 10h30" stroke="#ffffff" strokeWidth="6" />
      <path d="M15 0v20M0 10h30" stroke="#c8102e" strokeWidth="3.4" />
    </>
  );
}
