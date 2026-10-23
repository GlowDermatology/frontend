import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

import type { LandingDictionary } from "../content/uz";
import { IconBadge, SectionTitle, gutter } from "./primitives";

const ICONS: ReadonlyArray<IconName> = ["bag", "calendar", "qr", "coins"];

/** Hover lift used by landing cards (`.gd-card`): pointer devices only. */
export const liftCard =
  "transition-[transform,box-shadow] duration-[350ms] ease-soft hover:-translate-y-1 hover:shadow-lg";

export function Pillars({ dict }: { dict: LandingDictionary["pillars"] }) {
  return (
    <section aria-labelledby="pillars-title" className={cn("pb-[clamp(72px,9vw,128px)]", gutter)}>
      <div className="mx-auto flex max-w-[1184px] flex-col gap-12">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(420px,100%),1fr))] items-end gap-x-16 gap-y-6 border-t border-line pt-[clamp(40px,5vw,64px)]">
          <SectionTitle id="pillars-title">{dict.title}</SectionTitle>
          <p className="m-0 text-[17px] leading-7 text-pretty text-ink-muted">{dict.lead}</p>
        </div>
        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))] gap-5 p-0">
          {dict.items.map((item, index) => (
            <li key={item.title}>
              <article
                className={cn(
                  "flex h-full flex-col gap-[18px] rounded-lg border border-line bg-surface-raised p-7 shadow-sm",
                  liftCard,
                )}
              >
                <div className="flex items-center justify-between">
                  <IconBadge>
                    <Icon name={ICONS[index] ?? "sparkle"} size={24} />
                  </IconBadge>
                  <span aria-hidden="true" className="font-serif text-[28px] font-medium text-ink-muted">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="m-0 text-[20px] leading-[26px] font-bold text-ink">{item.title}</h3>
                <p className="m-0 text-[15px] leading-6 text-ink-muted">{item.body}</p>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
