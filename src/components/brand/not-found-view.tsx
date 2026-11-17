import Link from "next/link";

import { Rings } from "@/components/brand/rings";
import { buttonStyles } from "@/components/ui/button";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/locales";

import { brandCopy } from "./copy";

/** The home page of each language (`/`, `/ru`, `/en`). */
const HOME: Record<Locale, "/" | "/ru" | "/en"> = { uz: "/", ru: "/ru", en: "/en" };

/**
 * Branded 404 content, shared by the global and per-layout not-found pages: Uzbek by default
 * (the global page knows no language), the `/ru` and `/en` pages pass theirs.
 */
export function NotFoundView({ locale = DEFAULT_LOCALE }: { locale?: Locale }) {
  const t = brandCopy[locale].notFound;
  return (
    <main
      lang={locale === DEFAULT_LOCALE ? undefined : locale}
      className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-banner px-6 py-16"
    >
      <Rings
        viewBox={800}
        rings={[
          [120, 0.5],
          [190, 0.34],
          [260, 0.22],
          [330, 0.13],
          [395, 0.07],
        ]}
        className="absolute top-1/2 left-1/2 size-[900px] -translate-x-1/2 -translate-y-1/2"
      />
      <div className="relative flex max-w-[460px] flex-col items-center gap-5 text-center">
        <p className="m-0 font-serif text-[96px] leading-none font-semibold text-banner-ink">404</p>
        <h1 className="m-0 font-serif text-[34px] leading-10 font-semibold text-banner-ink">
          {t.title}
        </h1>
        <p className="m-0 text-[17px] leading-7 text-banner-ink-soft">{t.lead}</p>
        <Link href={HOME[locale]} className={buttonStyles({ size: "lg", lift: true })}>
          {t.home}
        </Link>
      </div>
    </main>
  );
}
