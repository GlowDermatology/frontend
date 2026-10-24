import { Rings } from "@/components/brand/rings";
import { buttonStyles } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { SECTION_IDS } from "@/config/site";
import { cn } from "@/lib/cn";

import type { LandingDictionary } from "../content/uz";
import { PhoneMockup } from "./phone-mockup";
import { Eyebrow, gutter } from "./primitives";

export function Hero({ dict }: { dict: LandingDictionary }) {
  const { hero } = dict;
  return (
    <section aria-labelledby="hero-title">
      <div
        className={cn(
          "mx-auto grid max-w-[1280px] grid-cols-[repeat(auto-fit,minmax(min(500px,100%),1fr))] items-center gap-[clamp(48px,5vw,80px)] pt-[clamp(48px,7vw,96px)] pb-[clamp(64px,8vw,112px)]",
          gutter,
        )}
      >
        <div className="flex flex-col gap-7">
          <Eyebrow>{hero.eyebrow}</Eyebrow>
          <h1
            id="hero-title"
            className="m-0 font-serif text-[clamp(56px,7.4vw,112px)] leading-[0.94] font-semibold tracking-[-0.025em] text-balance text-ink"
          >
            {hero.titleStart}{" "}
            <em className="font-medium text-gold-ink italic">{hero.titleEmphasis}</em>
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
        </div>

        <div className="relative flex min-h-[660px] items-center justify-center overflow-hidden rounded-lg bg-banner px-4 py-10">
          <Rings
            viewBox={800}
            rings={[
              [150, 0.55],
              [210, 0.38],
              [270, 0.25],
              [330, 0.15],
              [392, 0.08],
            ]}
            className="absolute top-1/2 left-1/2 size-[940px] -translate-x-1/2 -translate-y-1/2"
          />

          <PhoneMockup dict={dict.phone} label={hero.mockupLabel} />

          <div className="absolute top-9 right-5 hidden animate-rise-in items-center gap-3 rounded-full bg-surface-raised py-2.5 pr-[18px] pl-2.5 shadow-lg [animation-delay:350ms] sm:flex">
            <span className="flex size-8 items-center justify-center rounded-full bg-success-soft text-success">
              <Icon name="check" size={18} strokeWidth={2} />
            </span>
            <span className="flex flex-col">
              <span className="text-[13px] leading-[18px] font-bold text-ink">
                {hero.toastTitle}
              </span>
              <span className="text-[12px] leading-4 text-ink-muted">{hero.toastBody}</span>
            </span>
          </div>

          <div className="absolute bottom-10 left-5 flex w-[228px] animate-rise-in flex-col gap-2 rounded-lg bg-surface-raised p-[18px] shadow-lg [animation-delay:200ms]">
            <span className="text-overline text-ink-muted uppercase">{hero.balanceLabel}</span>
            <span className="text-price-lg text-ink tabular-nums">{hero.balanceValue}</span>
            <span
              aria-hidden="true"
              className="flex h-1.5 overflow-hidden rounded-full bg-gold-soft"
            >
              <span className="h-full w-[68%] rounded-full bg-gold" />
            </span>
            <span className="text-[12px] leading-4 text-ink-muted">{hero.balanceNote}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
