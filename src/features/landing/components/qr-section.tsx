import { Rings } from "@/components/brand/rings";
import { Icon } from "@/components/ui/icon";
import { SECTION_IDS } from "@/config/site";
import { cn } from "@/lib/cn";

import type { LandingDictionary } from "../content/uz";
import { Eyebrow, SectionTitle, gutter, sectionSpacing } from "./primitives";
import { SampleQrCode } from "./sample-qr-code";

export function QrSection({ dict }: { dict: LandingDictionary["qr"] }) {
  return (
    <section id={SECTION_IDS.qr} aria-labelledby="qr-title" className={cn(sectionSpacing, gutter)}>
      <div className="mx-auto grid max-w-[1184px] grid-cols-[repeat(auto-fit,minmax(min(440px,100%),1fr))] items-center gap-x-[88px] gap-y-14">
        <div className="relative flex min-h-[560px] items-center justify-center overflow-hidden rounded-lg bg-gold-soft px-5 py-12">
          <Rings
            viewBox={800}
            rings={[
              [200, 0.5],
              [260, 0.32],
              [320, 0.18],
              [385, 0.09],
            ]}
            className="absolute top-1/2 left-1/2 size-[860px] -translate-x-1/2 -translate-y-1/2"
          />
          {/* The scannable card stays light in every theme, like a printed code. */}
          <div
            data-theme="light"
            className="relative flex w-[300px] max-w-full flex-col items-center gap-[18px] rounded-lg bg-white p-7 shadow-lg"
          >
            <span className="text-overline text-ink-muted uppercase">{dict.cardLabel}</span>
            <SampleQrCode label={dict.codeLabel} />
            <span aria-hidden="true" className="flex h-1.5 w-full rounded-full bg-gold-soft">
              <span className="w-[70%] rounded-full bg-gold" />
            </span>
            <span className="text-body-sm text-ink-muted tabular-nums">{dict.refreshNote}</span>
          </div>
        </div>

        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-5">
            <Eyebrow>{dict.eyebrow}</Eyebrow>
            <SectionTitle id="qr-title">{dict.title}</SectionTitle>
            <p className="m-0 text-[17px] leading-7 text-pretty text-ink-muted">{dict.lead}</p>
          </div>
          <ol className="m-0 flex list-none flex-col p-0">
            {dict.steps.map((step, index) => (
              <li
                key={step.title}
                className="grid grid-cols-[64px_1fr] gap-5 border-t border-line py-[22px] last:border-b"
              >
                <span
                  aria-hidden="true"
                  className="font-serif text-[40px] leading-none font-medium text-gold-ink"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="flex flex-col gap-1.5">
                  <span className="text-[18px] leading-6 font-bold text-ink">{step.title}</span>
                  <span className="text-[15px] leading-[22px] text-ink-muted">{step.body}</span>
                </span>
              </li>
            ))}
          </ol>
          <p className="m-0 flex items-start gap-3 text-[14px] leading-[22px] text-ink-muted">
            <Icon name="shield-check" size={20} className="mt-px shrink-0 text-gold-ink" />
            {dict.security}
          </p>
        </div>
      </div>
    </section>
  );
}
