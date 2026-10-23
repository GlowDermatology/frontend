import { buttonStyles } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { SECTION_IDS } from "@/config/site";
import { cn } from "@/lib/cn";

import type { LandingDictionary } from "../content/uz";
import { BookingPreview } from "./booking-preview";
import { Eyebrow, SectionTitle, gutter, sectionSpacing } from "./primitives";

export function SpecialistsSection({ dict }: { dict: LandingDictionary["specialists"] }) {
  return (
    <section
      id={SECTION_IDS.specialists}
      aria-labelledby="pro-title"
      className={cn("border-y border-line bg-surface-raised", sectionSpacing, gutter)}
    >
      <div className="mx-auto grid max-w-[1184px] grid-cols-[repeat(auto-fit,minmax(min(440px,100%),1fr))] items-center gap-x-[88px] gap-y-14">
        <div className="flex flex-col gap-6">
          <Eyebrow>{dict.eyebrow}</Eyebrow>
          <SectionTitle id="pro-title">{dict.title}</SectionTitle>
          <p className="m-0 max-w-[500px] text-[17px] leading-7 text-pretty text-ink-muted">{dict.lead}</p>
          <ul className="m-0 flex list-none flex-col gap-3.5 p-0">
            {dict.benefits.map((benefit) => (
              <li key={benefit} className="flex items-center gap-3 text-[15px] leading-[22px] text-ink">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gold-soft text-gold-ink">
                  <Icon name="check" size={16} strokeWidth={2} />
                </span>
                {benefit}
              </li>
            ))}
          </ul>
          <div>
            <a href={`#${SECTION_IDS.download}`} className={buttonStyles({ size: "lg", lift: true })}>
              {dict.cta}
            </a>
          </div>
        </div>
        <BookingPreview dict={dict.booking} />
      </div>
    </section>
  );
}
