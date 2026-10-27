import Link from "next/link";

import { Rings } from "@/components/brand/rings";
import { buttonStyles } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n/locales";

import { Container } from "../components/layout-primitives";
import { errorCopy } from "../content/errors";
import { shopPath } from "../routing/routes";

/**
 * Storefront 404 inside the header and footer, in the page's language.
 * Shared by server (`(uz)`) and client (`[locale]`, which reads the
 * language with `useParams`) not-found files, so it imports only the small
 * error copy.
 */
export function ShopNotFound({ locale }: { locale: Locale }) {
  const t = errorCopy[locale];
  return (
    <Container className="py-[clamp(48px,8vw,120px)]">
      <section
        aria-labelledby="not-found-title"
        className="relative mx-auto flex max-w-[720px] flex-col items-center gap-5 overflow-hidden rounded-lg bg-banner px-6 py-[clamp(56px,8vw,112px)] text-center"
      >
        <Rings
          viewBox={800}
          rings={[
            [120, 0.5],
            [190, 0.34],
            [260, 0.22],
            [330, 0.13],
          ]}
          className="absolute top-1/2 left-1/2 size-[760px] -translate-x-1/2 -translate-y-1/2"
        />
        <p
          aria-hidden="true"
          className="relative m-0 font-serif text-[96px] leading-none font-semibold text-banner-ink"
        >
          404
        </p>
        <h1
          id="not-found-title"
          className="relative m-0 font-serif text-headline-sm font-semibold text-banner-ink"
        >
          {t.notFoundTitle}
        </h1>
        <p className="relative m-0 max-w-[440px] text-[17px] leading-7 text-banner-ink-soft">
          {t.notFoundBody}
        </p>
        <div className="relative flex flex-wrap justify-center gap-3">
          <Link
            href={shopPath(locale, { kind: "home" })}
            className={buttonStyles({ size: "lg", lift: true })}
          >
            {t.notFoundHome}
          </Link>
          <Link
            href={shopPath(locale, { kind: "catalog" })}
            className={buttonStyles({
              size: "lg",
              variant: "outline",
              className: "border-banner-ink-soft text-banner-ink-soft hover:bg-white/10",
            })}
          >
            {t.notFoundCatalog}
          </Link>
        </div>
      </section>
    </Container>
  );
}
