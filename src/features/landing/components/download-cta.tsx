import { Rings } from "@/components/brand/rings";
import { buttonStyles } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { SECTION_IDS, siteConfig } from "@/config/site";
import { cn } from "@/lib/cn";

import type { LandingDictionary } from "../content/uz";
import { Eyebrow, SectionTitle, gutter } from "./primitives";

/** Store URLs are not published yet; until then the buttons stay on this section. */
const fallbackHref = `#${SECTION_IDS.download}`;

export function DownloadCta({ dict }: { dict: LandingDictionary["download"] }) {
  return (
    <section
      id={SECTION_IDS.download}
      aria-labelledby="cta-title"
      className={cn("pb-[clamp(72px,9vw,128px)]", gutter)}
    >
      <div className="relative mx-auto grid max-w-[1184px] grid-cols-[repeat(auto-fit,minmax(min(420px,100%),1fr))] items-center gap-x-16 gap-y-10 overflow-hidden rounded-lg bg-banner px-[clamp(24px,6vw,88px)] py-[clamp(48px,7vw,96px)]">
        <Rings
          viewBox={800}
          rings={[
            [120, 0.5],
            [190, 0.34],
            [260, 0.22],
            [330, 0.13],
            [395, 0.07],
          ]}
          className="absolute top-1/2 -right-[300px] size-[900px] -translate-y-1/2"
        />
        <div className="relative flex flex-col gap-5">
          <Eyebrow onDark>{dict.eyebrow}</Eyebrow>
          <SectionTitle
            id="cta-title"
            className="text-[clamp(40px,4.8vw,66px)] leading-[1.02] tracking-[-0.02em] text-banner-ink"
          >
            {dict.title}
          </SectionTitle>
          <p className="m-0 max-w-[460px] text-[17px] leading-7 text-banner-ink-soft">
            {dict.lead}
          </p>
        </div>
        <div className="relative flex w-full max-w-[340px] flex-col gap-3 justify-self-start">
          <a
            href={siteConfig.links.appStore ?? fallbackHref}
            className={buttonStyles({ size: "xl", lift: true, className: "w-full gap-2.5" })}
          >
            <Icon name="download" size={20} />
            {dict.appStore}
          </a>
          <a
            href={siteConfig.links.googlePlay ?? fallbackHref}
            className={buttonStyles({
              variant: "outline",
              size: "xl",
              lift: true,
              className:
                "w-full gap-2.5 border-banner-ink-soft/50 text-banner-ink-soft hover:bg-white/5",
            })}
          >
            <Icon name="download" size={20} />
            {dict.googlePlay}
          </a>
        </div>
      </div>
    </section>
  );
}
