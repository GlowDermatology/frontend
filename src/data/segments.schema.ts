import { z } from "zod";

import { segmentCopy } from "@/domain/copy/segments";
import { SEGMENT_NAME_MAX, SEGMENT_NAME_MIN } from "@/domain/segment";
import { createFormatter } from "@/lib/format";
import { localized, type LocalizedOf } from "@/lib/i18n/localized";
import { validationCopy } from "@/lib/i18n/validation-copy";

/**
 * Validation of the group dialog (contract §2.8 `POST/PATCH segments/`),
 * shared by the form and the Server Actions, one schema per admin language. A
 * rule that is switched off is `null`; a switched-on rule is a positive integer.
 */

/**
 * Upper bounds the backend can store and an admin can mean: `min_online_orders`
 * is a 32-bit column (a larger value is a 500 there), so the orders rule stops
 * at a realistic 100 000; the amount stops at 1 trillion so‘m.
 */
export const SEGMENT_ORDERS_MAX = 100_000;
export const SEGMENT_AMOUNT_MAX = 1_000_000_000_000;

export const segmentFormSchemas = localized((locale) => {
  const m = validationCopy[locale];
  const s = segmentCopy[locale].schema;
  const fmt = createFormatter(locale);
  const rule = (message: string, max: number) =>
    z
      .number({ error: message })
      .int(message)
      .min(1, message)
      .max(max, s.max(fmt.number(max)))
      .nullable();
  return z.object({
    name: z
      .string()
      .trim()
      .min(SEGMENT_NAME_MIN, m.minChars(SEGMENT_NAME_MIN))
      .max(SEGMENT_NAME_MAX, m.maxChars(SEGMENT_NAME_MAX)),
    rules: z.object({
      minOnlineOrders: rule(s.orders, SEGMENT_ORDERS_MAX),
      minLifetimeAmount: rule(s.amount, SEGMENT_AMOUNT_MAX),
    }),
  });
});

export type SegmentFormValues = z.infer<LocalizedOf<typeof segmentFormSchemas>>;

export const EMPTY_SEGMENT: SegmentFormValues = {
  name: "",
  rules: { minOnlineOrders: null, minLifetimeAmount: null },
};
