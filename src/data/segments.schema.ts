import { z } from "zod";

import { SEGMENT_NAME_MAX, SEGMENT_NAME_MIN } from "@/domain/segment";

/**
 * Validation of the group dialog (contract §2.8 `POST/PATCH segments/`),
 * shared by the form and the Server Actions. A rule that is switched off is
 * `null`; a switched-on rule is a positive integer.
 */

const rule = (message: string) =>
  z
    .number({ error: message })
    .int(message)
    .min(1, message)
    .max(1_000_000_000_000, message)
    .nullable();

export const segmentFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(SEGMENT_NAME_MIN, `Kamida ${SEGMENT_NAME_MIN} ta belgi kiriting.`)
    .max(SEGMENT_NAME_MAX, `${SEGMENT_NAME_MAX} belgidan oshmasin.`),
  rules: z.object({
    minOnlineOrders: rule("Buyurtmalar sonini kiriting (1 yoki ko‘p)."),
    minLifetimeAmount: rule("Summani kiriting (1 so‘mdan ko‘p)."),
  }),
});

export type SegmentFormValues = z.infer<typeof segmentFormSchema>;

export const EMPTY_SEGMENT: SegmentFormValues = {
  name: "",
  rules: { minOnlineOrders: null, minLifetimeAmount: null },
};
