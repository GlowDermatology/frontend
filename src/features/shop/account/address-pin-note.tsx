import { Icon } from "@/components/ui/icon";
import { hasPin, type ShopAddress } from "@/domain/shop-account";
import { cn } from "@/lib/cn";
import type { Locale } from "@/lib/i18n/locales";

import { accountCopy } from "../copy/account";

/**
 * "Xaritada belgilangan" or the missing-pin hint under a saved address, so
 * the customer sees which addresses courier delivery (Yandex) can reach.
 * Used by the account's address list and the checkout address choice.
 */
export function AddressPinNote({
  locale,
  address,
  className,
}: {
  locale: Locale;
  address: Pick<ShopAddress, "latitude" | "longitude">;
  className?: string;
}) {
  const copy = accountCopy[locale].addresses.map;
  const pinned = hasPin(address);
  return (
    <span
      className={cn(
        "inline-flex items-start gap-1.5 text-caption",
        pinned ? "text-ink" : "text-ink-muted",
        className,
      )}
    >
      <Icon
        name={pinned ? "map-pin" : "alert-circle"}
        size={16}
        className={cn("mt-px shrink-0", pinned ? "text-gold-ink" : "text-ink-muted")}
      />
      <span>{pinned ? copy.pinned : copy.missing}</span>
    </span>
  );
}
