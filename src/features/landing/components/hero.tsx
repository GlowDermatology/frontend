import { CollectionHero } from "@/components/brand/collection-hero";
import { buttonStyles } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { SECTION_IDS } from "@/config/site";

import type { LandingDictionary } from "../content/uz";
import { Eyebrow } from "./primitives";

export function Hero({ dict }: { dict: LandingDictionary }) {
  const { hero } = dict;
  return (
    <CollectionHero>
      <Eyebrow>{hero.eyebrow}</Eyebrow>
      <h1
        id="hero-title"
        className="m-0 font-serif text-[clamp(42px,5vw,76px)] leading-[1.02] font-medium tracking-[-0.035em] text-balance text-ink"
      >
        {hero.titleStart} <em className="font-medium text-gold-ink italic">{hero.titleEmphasis}</em>
        {hero.titleEnd && ` ${hero.titleEnd}`}
      </h1>
      <p className="m-0 max-w-[520px] text-[18px] leading-[30px] text-pretty text-ink-muted">
        {hero.lead}
      </p>
      <div className="flex flex-wrap gap-3">
        <a
          href={`#${SECTION_IDS.download}`}
          className={buttonStyles({ size: "lg", lift: true, className: "gap-2.5" })}
        >
          <Icon name="download" size={20} />
          {hero.primaryCta}
        </a>
        <a
          href={`#${SECTION_IDS.specialists}`}
          className={buttonStyles({
            variant: "outline",
            size: "lg",
            lift: true,
            className: "px-6",
          })}
        >
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
