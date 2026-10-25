import { z } from "zod";

import { SEGMENT_NAME_MAX, SEGMENT_NAME_MIN } from "@/domain/segment";
import { formatNumber } from "@/lib/format";

/**
 * Validation of the group dialog (contract §2.8 `POST/PATCH segments/`),
 * shared by the form and the Server Actions. A rule that is switched off is
 * `null`; a switched-on rule is a positive integer.
 */

/**
 * Upper bounds the backend can store and an admin can mean: `min_online_orders`
 * is a 32-bit column (a larger value is a 500 there), so the orders rule stops
 * at a realistic 100 000; the amount stops at 1 trillion so‘m.
 */
export const SEGMENT_ORDERS_MAX = 100_000;
export const SEGMENT_AMOUNT_MAX = 1_000_000_000_000;

const maxMessage = (max: number) => `Qiymat ${formatNumber(max)} dan oshmasin.`;

const rule = (message: string, max: number) =>
  z.number({ error: message }).int(message).min(1, message).max(max, maxMessage(max)).nullable();

export const segmentFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(SEGMENT_NAME_MIN, `Kamida ${SEGMENT_NAME_MIN} ta belgi kiriting.`)
    .max(SEGMENT_NAME_MAX, `${SEGMENT_NAME_MAX} belgidan oshmasin.`),
  rules: z.object({
    minOnlineOrders: rule("Buyurtmalar sonini kiriting (1 yoki ko‘p).", SEGMENT_ORDERS_MAX),
    minLifetimeAmount: rule("Summani kiriting (1 so‘mdan ko‘p).", SEGMENT_AMOUNT_MAX),
  }),
});

export type SegmentFormValues = z.infer<typeof segmentFormSchema>;

export const EMPTY_SEGMENT: SegmentFormValues = {
  name: "",
  rules: { minOnlineOrders: null, minLifetimeAmount: null },
};
