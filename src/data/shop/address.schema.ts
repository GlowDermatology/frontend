import { z } from "zod";

import { isLatitude, isLongitude, roundCoordinate } from "@/domain/geo-pin";
import type { Locale } from "@/lib/i18n/locales";

/**
 * The map pin of `me/addresses/` (`latitude`, `longitude`; Yandex Delivery):
 * both numbers or both `null`, in range, sent with at most 6 decimals. The
 * API checks the same pair rule (`field.latlng_pair`); checking it here keeps
 * a broken form from reaching it.
 */

const PIN_INVALID: Record<Locale, string> = {
  uz: "Xaritadagi nuqtani qayta belgilang.",
  ru: "Отметьте точку на карте ещё раз.",
  en: "Set the point on the map again.",
};

export function addressPinSchema(locale: Locale) {
  const message = PIN_INVALID[locale];
  const coordinate = (inRange: (value: number) => boolean) =>
    z
      .number({ error: message })
      .refine(inRange, { error: message })
      .transform(roundCoordinate)
      .nullable();
  return z
    .object({ latitude: coordinate(isLatitude), longitude: coordinate(isLongitude) })
    .refine((pin) => (pin.latitude === null) === (pin.longitude === null), {
      error: message,
      path: ["latitude"],
    });
}

export type AddressPin = z.output<ReturnType<typeof addressPinSchema>>;
