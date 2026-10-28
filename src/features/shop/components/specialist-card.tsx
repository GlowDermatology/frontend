import Image from "next/image";
import Link from "next/link";

import { initials } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import type { ShopSpecialist } from "@/domain/shop";
import { formatPrice } from "@/lib/format";
import type { Locale } from "@/lib/i18n/locales";
import { cn } from "@/lib/cn";

import type { ShopDictionary } from "../content";
import { shopPath } from "../routing/routes";
import { liftCard } from "./layout-primitives";

/** Round portrait with a gold ring; initials on gold-soft without a photo. */
export function SpecialistPortrait({
  specialist,
  size,
  sizes,
  priority = false,
}: {
  specialist: Pick<ShopSpecialist, "name" | "photo">;
  size: number;
  sizes: string;
  priority?: boolean;
}) {
  return (
    <span
      style={{ width: size, height: size }}
      className="relative flex shrink-0 items-center justify-center rounded-full bg-gold-soft ring-1 ring-gold/60 ring-offset-4 ring-offset-surface-raised"
    >
      {specialist.photo ? (
        <Image
          src={specialist.photo}
          alt=""
          fill
          sizes={sizes}
          priority={priority}
          className="rounded-full object-cover"
        />
      ) : (
        <span
          aria-hidden="true"
          className="font-serif font-semibold text-gold-ink"
          style={{ fontSize: Math.round(size * 0.36) }}
        >
          {initials(specialist.name)}
        </span>
      )}
    </span>
  );
}

export function SpecialistCard({
  specialist,
  locale,
  dict,
  headingLevel: Heading = "h3",
}: {
  specialist: ShopSpecialist;
  locale: Locale;
  dict: ShopDictionary;
  headingLevel?: "h2" | "h3";
}) {
  const cheapest = specialist.services.reduce<number | null>(
    (min, service) => (min === null || service.price < min ? service.price : min),
    null,
  );
  return (
    <article
      className={cn(
        "group relative flex h-full flex-col gap-5 rounded-lg border border-line bg-surface-raised p-[clamp(20px,2.4vw,32px)]",
        liftCard,
        "has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-gold-ink has-[a:focus-visible]:[outline-style:solid]",
      )}
    >
      <SpecialistPortrait specialist={specialist} size={88} sizes="88px" />
      <div className="flex flex-col gap-1.5">
        <p className="m-0 text-overline text-ink-muted uppercase">{specialist.roleLabel}</p>
        <Heading className="m-0 font-serif text-[28px] leading-8 font-semibold text-ink">
          <Link
            href={shopPath(locale, { kind: "specialist", slug: specialist.segment })}
            className="text-ink no-underline after:absolute after:inset-0 after:rounded-lg after:content-[''] focus-visible:outline-none"
          >
            {specialist.name}
          </Link>
        </Heading>
        {specialist.experienceYears ? (
          <p className="m-0 text-body-sm text-ink-muted">
            {dict.specialists.experience(specialist.experienceYears)}
          </p>
        ) : null}
      </div>
      {specialist.bio ? (
        <p className="m-0 line-clamp-3 text-body text-pretty text-ink-muted">{specialist.bio}</p>
      ) : null}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-body-sm">
        <span className="text-ink-muted">
          {dict.specialists.servicesCount(specialist.services.length)}
          {cheapest !== null ? (
            <>
              {" · "}
              <span className="font-semibold text-ink">
                {dict.specialists.priceFrom(formatPrice(cheapest, locale))}
              </span>
            </>
          ) : null}
        </span>
        <span aria-hidden="true" className="inline-flex items-center gap-1.5 font-bold text-ink">
          {dict.specialists.viewProfile}
          <Icon
            name="arrow-right"
            size={18}
            className="text-gold-ink transition-transform duration-300 ease-soft group-hover:translate-x-1"
          />
        </span>
      </div>
    </article>
  );
}
