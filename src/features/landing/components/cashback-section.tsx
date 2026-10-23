import { Rings } from "@/components/brand/rings";
import { Icon, type IconName } from "@/components/ui/icon";
import { SECTION_IDS } from "@/config/site";
import { cn } from "@/lib/cn";

import type { LandingDictionary } from "../content/uz";
import { Eyebrow, SectionTitle, gutter } from "./primitives";

/** Tier rates and bar fills shown on the landing page (marketing copy, not the live policy). */
const TIER_VISUALS = [
  { rate: "1%", fill: "w-[33%]" },
  { rate: "2%", fill: "w-[66%]" },
  { rate: "3%", fill: "w-full" },
] as const;

const CHIP_ICONS: ReadonlyArray<IconName> = ["clock", "store"];

export function CashbackSection({ dict }: { dict: LandingDictionary["cashback"] }) {
  return (
    <section
      id={SECTION_IDS.cashback}
      aria-labelledby="cashback-title"
      className="relative overflow-hidden bg-banner"
    >
      <Rings
        viewBox={800}
        rings={[
          [110, 0.5],
          [180, 0.34],
          [250, 0.22],
          [320, 0.13],
          [390, 0.07],
        ]}
        className="absolute top-1/2 -right-[380px] size-[1100px] -translate-y-1/2"
      />
      <div
        className={cn(
          "relative mx-auto grid max-w-[1280px] grid-cols-[repeat(auto-fit,minmax(min(460px,100%),1fr))] items-center gap-x-20 gap-y-14 py-[clamp(72px,9vw,128px)]",
          gutter,
        )}
      >
        <div className="flex flex-col gap-6">
          <Eyebrow onDark>{dict.eyebrow}</Eyebrow>
          <SectionTitle
            id="cashback-title"
            className="text-[clamp(44px,5.4vw,76px)] leading-none tracking-[-0.02em] text-banner-ink"
          >
            {dict.title}
          </SectionTitle>
          <p className="m-0 max-w-[500px] text-[18px] leading-[30px] text-pretty text-banner-ink-soft">
            {dict.lead}
          </p>
          <ul className="m-0 flex list-none flex-wrap gap-2.5 p-0">
            {dict.chips.map((chip, index) => (
              <li
                key={chip}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-gold/35 px-4 text-label text-banner-ink-soft"
              >
                <Icon name={CHIP_ICONS[index] ?? "clock"} size={18} className="text-banner-ink" />
                {chip}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-4">
          <ol className="m-0 list-none rounded-lg border border-gold/30 bg-white/[0.024] px-[clamp(20px,3vw,36px)] py-2">
            {dict.tiers.map((tier, index) => {
              const visual = TIER_VISUALS[index] ?? TIER_VISUALS[0];
              return (
                <li
                  key={tier.name}
                  className="grid grid-cols-[minmax(96px,auto)_1fr] items-center gap-x-7 gap-y-2 border-b border-gold/20 py-7 last:border-b-0"
                >
                  <span className="font-serif text-[clamp(52px,5vw,72px)] leading-none font-semibold text-banner-ink tabular-nums">
                    {visual.rate}
                  </span>
                  <span className="flex flex-col gap-2.5">
                    <span className="text-overline text-banner-ink-soft uppercase">{tier.name}</span>
                    <span className="text-[18px] leading-6 font-semibold text-banner-ink-soft">
                      {tier.range}
                    </span>
                    <span aria-hidden="true" className="flex h-1 rounded-full bg-gold/15">
                      <span className={cn("rounded-full bg-gold", visual.fill)} />
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>
          <p className="m-0 px-1 text-[13px] leading-5 text-banner-ink-soft">{dict.note}</p>
        </div>
      </div>
    </section>
  );
}
