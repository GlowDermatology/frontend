import { Icon, type IconName } from "@/components/ui/icon";
import { SECTION_IDS } from "@/config/site";
import { cn } from "@/lib/cn";

import type { LandingDictionary } from "../content/uz";
import { Eyebrow, IconBadge, SectionTitle, gutter, sectionSpacing } from "./primitives";

const OPTION_ICONS: ReadonlyArray<IconName> = ["truck", "store", "card"];

/** Index of the step the sample order is at (handed to the courier). */
const CURRENT_STEP = 2;

export function DeliverySection({ dict }: { dict: LandingDictionary["delivery"] }) {
  const { tracker } = dict;
  return (
    <section
      id={SECTION_IDS.delivery}
      aria-labelledby="delivery-title"
      className={cn(sectionSpacing, gutter)}
    >
      <div className="mx-auto flex max-w-[1184px] flex-col gap-12">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(420px,100%),1fr))] items-end gap-x-16 gap-y-6">
          <div className="flex flex-col gap-5">
            <Eyebrow>{dict.eyebrow}</Eyebrow>
            <SectionTitle id="delivery-title">{dict.title}</SectionTitle>
          </div>
          <p className="m-0 text-[17px] leading-7 text-pretty text-ink-muted">{dict.lead}</p>
        </div>

        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-5 p-0">
          {dict.options.map((option, index) => (
            <li key={option.title}>
              <article className="flex h-full flex-col gap-3.5 rounded-lg border border-line bg-surface-raised p-7">
                <IconBadge size={48}>
                  <Icon name={OPTION_ICONS[index] ?? "truck"} size={24} />
                </IconBadge>
                <h3 className="m-0 text-[19px] leading-[26px] font-bold text-ink">
                  {option.title}
                </h3>
                <p className="m-0 text-[15px] leading-6 text-ink-muted">{option.body}</p>
              </article>
            </li>
          ))}
        </ul>

        <figure className="m-0 flex flex-col gap-7 rounded-lg border border-line bg-surface-raised p-[clamp(24px,3vw,36px)]">
          <figcaption className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-heading text-ink">{tracker.order}</span>
            <span className="inline-flex h-7 items-center gap-2 rounded-sm bg-line px-3 text-overline text-ink uppercase">
              <span aria-hidden="true" className="size-2 rounded-full bg-ink-muted" />
              {tracker.status}
            </span>
          </figcaption>
          <ol className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-6 p-0">
            {tracker.steps.map((step, index) => {
              const done = index < CURRENT_STEP;
              const current = index === CURRENT_STEP;
              const last = index === tracker.steps.length - 1;
              return (
                <li
                  key={step.title}
                  aria-current={current ? "step" : undefined}
                  className="flex flex-col gap-3"
                >
                  <span aria-hidden="true" className="flex items-center gap-2.5">
                    {done ? (
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-gold text-on-gold">
                        <Icon name="check" size={14} strokeWidth={2.5} />
                      </span>
                    ) : current ? (
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-gold bg-surface-raised">
                        <span className="size-2 rounded-full bg-gold" />
                      </span>
                    ) : (
                      <span className="size-6 shrink-0 rounded-full border-2 border-line-strong bg-surface-raised" />
                    )}
                    {!last && <span className={cn("h-0.5 flex-1", done ? "bg-gold" : "bg-line")} />}
                  </span>
                  <span
                    className={cn(
                      "text-[15px] leading-5 font-bold",
                      done || current ? "text-ink" : "text-ink-muted",
                    )}
                  >
                    {step.title}
                    {current && <span className="sr-only"> ({tracker.currentStep})</span>}
                  </span>
                  <span className="text-[13px] leading-5 text-ink-muted">{step.body}</span>
                </li>
              );
            })}
          </ol>
        </figure>
      </div>
    </section>
  );
}
