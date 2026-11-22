import { CollectionHero } from "@/components/brand/collection-hero";
import { homeActionAccent, homeActionStyles } from "@/components/brand/home-actions";
import { Icon } from "@/components/ui/icon";
import { SECTION_IDS } from "@/config/site";

import type { LandingDictionary } from "../content/uz";

export function Hero({ dict }: { dict: LandingDictionary }) {
  const { hero } = dict;
  return (
    <CollectionHero>
      <p className="m-0 inline-flex items-center gap-2 rounded-full bg-gold-soft px-3.5 py-2 text-overline text-ink uppercase">
        <Icon name="shield-check" size={17} className="shrink-0 text-gold-ink" />
        {hero.eyebrow}
      </p>
      <h1
        id="hero-title"
        className="m-0 font-serif text-[clamp(40px,4.6vw,68px)] leading-[1.02] font-medium tracking-[-0.035em] text-balance text-ink"
      >
        {hero.titleStart} <em className="font-medium text-gold-ink italic">{hero.titleEmphasis}</em>
        {hero.titleEnd && ` ${hero.titleEnd}`}
      </h1>
      <p className="m-0 max-w-[520px] text-[18px] leading-[30px] text-pretty text-ink-muted">
        {hero.lead}
      </p>
      <div className="flex flex-wrap gap-3">
        <a href={`#${SECTION_IDS.download}`} className={homeActionStyles()}>
          <Icon name="download" size={20} className={homeActionAccent} />
          {hero.primaryCta}
        </a>
        <a href={`#${SECTION_IDS.specialists}`} className={homeActionStyles({ secondary: true })}>
          <Icon name="calendar" size={20} className="shrink-0 text-gold-ink" />
          {hero.secondaryCta}
        </a>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5 text-body-sm text-ink-muted">
        <span className="inline-flex items-center gap-2">
          <Icon name="phone" size={16} />
          {hero.platforms}
        </span>
        <span aria-hidden="true" className="size-1 rounded-full bg-gold" />
        <span className="inline-flex items-center gap-2">
          <Icon name="globe" size={16} />
          {hero.languages}
        </span>
      </div>
    </CollectionHero>
  );
}
