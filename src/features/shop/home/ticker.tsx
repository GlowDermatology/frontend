import { PAYMENT_PROVIDER_NAME } from "@/domain/order";
import type { ShopSettings } from "@/domain/shop";
import type { Locale } from "@/lib/i18n/locales";

import { gutter } from "../components/layout-primitives";
import { homeCopy } from "../copy/home";
import { cn } from "@/lib/cn";

/** The ticker's facts, all from `settings/public/`: nothing is shown that the store did not set. */
export function tickerItems(
  settings: Pick<ShopSettings, "deliveryProviders" | "fulfilmentMethods" | "paymentProviders">,
  locale: Locale,
): string[] {
  const copy = homeCopy[locale].ticker;
  const items: string[] = [];
  if (settings.deliveryProviders.includes("yandex")) items.push(copy.yandex);
  if (settings.deliveryProviders.includes("bts")) items.push(copy.bts);
  if (settings.fulfilmentMethods.includes("pickup")) items.push(copy.pickup);
  if (settings.paymentProviders.length) {
    items.push(
      copy.payments(
        settings.paymentProviders.map((provider) => PAYMENT_PROVIDER_NAME[provider]).join(" · "),
      ),
    );
  }
  return items;
}

/**
 * The slim bar above the home header. The line is doubled and slides by one
 * copy's width (CSS, `.gd-ticker`); the second copy is hidden from
 * assistive technology, and under reduced motion the line stands still and
 * scrolls by hand instead.
 */
export function Ticker({ items, label }: { items: string[]; label: string }) {
  if (items.length === 0) return null;
  const line = (hidden: boolean) => (
    <ul
      aria-hidden={hidden || undefined}
      className="m-0 flex shrink-0 list-none gap-10 p-0 pr-10 whitespace-nowrap"
    >
      {items.map((item) => (
        <li key={item} className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-gold" />
          {item}
        </li>
      ))}
    </ul>
  );
  return (
    <div
      role="region"
      aria-label={label}
      className="bg-nav text-caption font-medium text-banner-ink-soft"
    >
      <div className={cn("mx-auto flex h-10 max-w-page items-center", gutter)}>
        <div className="min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_4%,#000_96%,transparent)] motion-reduce:overflow-x-auto">
          <div className="gd-ticker flex w-max">
            {line(false)}
            <span className="contents motion-reduce:hidden">{line(true)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
