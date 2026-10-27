import { z } from "zod";

import {
  BLOCK_LABEL_MAX,
  DURATION_GRID_MESSAGE,
  DURATION_MAX,
  DURATION_MIN,
  END_AFTER_START_MESSAGE,
  EXPERIENCE_MAX,
  GRID_MESSAGE,
  LOCATION_ADDRESS_MAX,
  minutesOf,
  NAME_MAX,
  NAME_MIN,
  onGrid,
  OVERRIDE_NOTE_MAX,
  PRICE_MAX,
  SERVICE_CATEGORIES,
  SERVICE_NAME_MAX,
  SERVICE_SHORT_MAX,
  SLOT_STEPS,
  SPECIALIST_ROLES,
  TEXT_MAX,
  TIME_FORMAT_MESSAGE,
  TIME_PATTERN,
} from "@/domain/clinic";
import { PHONE_PATTERN } from "@/lib/phone";

/**
 * Validation of the specialists, services, schedules and clinic forms
 * (contract §2.17), shared by the forms and the Server Actions. The server
 * stays the authority (overlaps, the date window, races); these rules catch
 * what the form can know.
 */

const text = (max: number) => z.string().trim().max(max, `${max} belgidan oshmasin.`);
const i18n = (max: number) => z.object({ uz: text(max), ru: text(max), en: text(max) });

const time = z
  .string()
  .trim()
  .regex(TIME_PATTERN, TIME_FORMAT_MESSAGE)
  .refine(onGrid, { error: GRID_MESSAGE });

/* --- Specialist profile --- */

export const specialistFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(NAME_MIN, "Kamida 2 ta belgi kiriting.")
    .max(NAME_MAX, `${NAME_MAX} belgidan oshmasin.`),
  role: z.enum(SPECIALIST_ROLES, { error: "Mutaxassislikni tanlang." }),
  qualifications: i18n(TEXT_MAX),
  bio: i18n(TEXT_MAX),
  experienceYears: z
    .number({ error: "Butun son kiriting." })
    .int("Butun son kiriting.")
    .min(0, "Qiymat 0 dan kam bo‘lmasin.")
    .max(EXPERIENCE_MAX, `Qiymat ${EXPERIENCE_MAX} dan oshmasin.`)
    .nullable(),
  slotStepMin: z.union(
    SLOT_STEPS.map((step) => z.literal(step)) as unknown as [
      z.ZodLiteral<10>,
      z.ZodLiteral<15>,
      z.ZodLiteral<20>,
      z.ZodLiteral<30>,
      z.ZodLiteral<60>,
    ],
    { error: "Ruxsat etilgan qadamlar: 10, 15, 20, 30 yoki 60 daqiqa." },
  ),
  /** A staff account id, or `""` for none. */
  staffUserId: z.string().regex(/^(|[1-9]\d{0,17})$/, "Xodimni tanlang."),
  isActive: z.boolean(),
});
export type SpecialistFormValues = z.infer<typeof specialistFormSchema>;

export const EMPTY_SPECIALIST: SpecialistFormValues = {
  name: "",
  role: "dermatologist",
  qualifications: { uz: "", ru: "", en: "" },
  bio: { uz: "", ru: "", en: "" },
  experienceYears: null,
  slotStepMin: 30,
  staffUserId: "",
  // Decision PS-6: a new specialist starts inactive (add the offer and the hours, then activate).
  isActive: false,
};

/* --- Offered services --- */

const duration = z
  .number({ error: "Butun son kiriting." })
  .int("Butun son kiriting.")
  .min(DURATION_MIN, `Qiymat ${DURATION_MIN} dan kam bo‘lmasin.`)
  .max(DURATION_MAX, `Qiymat ${DURATION_MAX} dan oshmasin.`)
  .refine((value) => value % 5 === 0, { error: DURATION_GRID_MESSAGE });

export const offeredServicesSchema = z.object({
  services: z
    .array(
      z.object({
        serviceId: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/, "Xizmatni tanlang."),
        price: z
          .number({ error: "Narxni kiriting." })
          .int("Butun son kiriting.")
          .min(0, "Narx 0 dan kam bo‘lmasin.")
          .max(PRICE_MAX, "Narx juda katta."),
        /** `null` = the service's default duration. */
        durationMin: duration.nullable(),
        isActive: z.boolean(),
      }),
    )
    .max(50, "Ko‘pi bilan 50 ta.")
    .superRefine((rows, ctx) => {
      const seen = new Set<string>();
      rows.forEach((row, index) => {
        if (seen.has(row.serviceId)) {
          ctx.addIssue({
            code: "custom",
            path: [index, "serviceId"],
            message: "Bu xizmat ro‘yxatda ikki marta berilgan.",
          });
        }
        seen.add(row.serviceId);
      });
    }),
});
export type OfferedServicesValues = z.infer<typeof offeredServicesSchema>;

/* --- Weekly hours --- */

export const workingWeekSchema = z.object({
  days: z
    .array(
      z
        .object({
          weekday: z.number().int().min(0).max(6),
          start: time,
          end: time,
          breakStart: time.nullable(),
          breakEnd: time.nullable(),
        })
        .superRefine((day, ctx) => {
          if (minutesOf(day.end) <= minutesOf(day.start)) {
            ctx.addIssue({ code: "custom", path: ["end"], message: END_AFTER_START_MESSAGE });
          }
          if ((day.breakStart === null) !== (day.breakEnd === null)) {
            ctx.addIssue({
              code: "custom",
              path: [day.breakStart === null ? "breakStart" : "breakEnd"],
              message: "Tanaffusning boshlanishi va tugashini birga kiriting.",
            });
            return;
          }
          if (day.breakStart && day.breakEnd) {
            if (minutesOf(day.breakEnd) <= minutesOf(day.breakStart)) {
              ctx.addIssue({
                code: "custom",
                path: ["breakEnd"],
                message: END_AFTER_START_MESSAGE,
              });
            } else if (
              minutesOf(day.breakStart) < minutesOf(day.start) ||
              minutesOf(day.breakEnd) > minutesOf(day.end)
            ) {
              ctx.addIssue({
                code: "custom",
                path: ["breakStart"],
                message: "Tanaffus ish vaqti ichida bo‘lsin.",
              });
            }
          }
        }),
    )
    .max(7, "Ko‘pi bilan 7 ta.")
    .refine((days) => new Set(days.map((d) => d.weekday)).size === days.length, {
      error: "Bu hafta kuni ikki marta berilgan.",
    }),
});
export type WorkingWeekValues = z.infer<typeof workingWeekSchema>;

/* --- Date overrides and blocked periods --- */

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Sanani tanlang.")
  .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), { error: "Sanani tanlang." });

export const overrideFormSchema = z
  .object({
    date: isoDate,
    dayOff: z.boolean(),
    start: z.string().trim(),
    end: z.string().trim(),
    note: text(OVERRIDE_NOTE_MAX),
  })
  .superRefine((values, ctx) => {
    if (values.dayOff) return;
    for (const field of ["start", "end"] as const) {
      const value = values[field];
      if (!TIME_PATTERN.test(value)) {
        ctx.addIssue({ code: "custom", path: [field], message: TIME_FORMAT_MESSAGE });
      } else if (!onGrid(value)) {
        ctx.addIssue({ code: "custom", path: [field], message: GRID_MESSAGE });
      }
    }
    if (
      TIME_PATTERN.test(values.start) &&
      TIME_PATTERN.test(values.end) &&
      minutesOf(values.end) <= minutesOf(values.start)
    ) {
      ctx.addIssue({ code: "custom", path: ["end"], message: END_AFTER_START_MESSAGE });
    }
  });
export type OverrideFormValues = z.infer<typeof overrideFormSchema>;

/** Aware ISO datetimes in Tashkent time (`…+05:00`) from the block form's date and time inputs. */
export const blockFormSchema = z
  .object({
    startDate: isoDate,
    startTime: time,
    endDate: isoDate,
    endTime: time,
    kind: z.enum(["busy", "off"]),
    label: text(BLOCK_LABEL_MAX),
  })
  .superRefine((values, ctx) => {
    const start = Date.parse(`${values.startDate}T${values.startTime}:00+05:00`);
    const end = Date.parse(`${values.endDate}T${values.endTime}:00+05:00`);
    if (!Number.isNaN(start) && !Number.isNaN(end) && end <= start) {
      ctx.addIssue({ code: "custom", path: ["endTime"], message: END_AFTER_START_MESSAGE });
    }
  });
export type BlockFormValues = z.infer<typeof blockFormSchema>;

export function blockStart(values: BlockFormValues): string {
  return `${values.startDate}T${values.startTime}:00+05:00`;
}
export function blockEnd(values: BlockFormValues): string {
  return `${values.endDate}T${values.endTime}:00+05:00`;
}

/* --- Services --- */

export const serviceFormSchema = z.object({
  name: z.object({
    uz: z
      .string()
      .trim()
      .min(2, "Kamida 2 ta belgi kiriting.")
      .max(SERVICE_NAME_MAX, `${SERVICE_NAME_MAX} belgidan oshmasin.`),
    ru: text(SERVICE_NAME_MAX),
    en: text(SERVICE_NAME_MAX),
  }),
  /** `""` on create = the first 40 characters of `name.uz` (the server's default). */
  shortName: i18n(SERVICE_SHORT_MAX),
  description: i18n(TEXT_MAX),
  category: z.enum(SERVICE_CATEGORIES, { error: "Kategoriyani tanlang." }),
  defaultDurationMin: duration,
  defaultPrice: z
    .number({ error: "Butun son kiriting." })
    .int("Butun son kiriting.")
    .min(0, "Narx 0 dan kam bo‘lmasin.")
    .max(PRICE_MAX, "Narx juda katta.")
    .nullable(),
  isActive: z.boolean(),
});
export type ServiceFormValues = z.infer<typeof serviceFormSchema>;

export const EMPTY_SERVICE: ServiceFormValues = {
  name: { uz: "", ru: "", en: "" },
  shortName: { uz: "", ru: "", en: "" },
  description: { uz: "", ru: "", en: "" },
  category: "dermatology",
  defaultDurationMin: 30,
  defaultPrice: null,
  isActive: true,
};

/* --- The clinic --- */

const coordinate = (limit: number) =>
  z
    .number({ error: "Son kiriting." })
    .min(-limit, `Qiymat −${limit} dan kam bo‘lmasin.`)
    .max(limit, `Qiymat ${limit} dan oshmasin.`)
    .refine((value) => Math.round(value * 1e6) / 1e6 === value, {
      error: "Ko‘pi bilan 6 ta kasr raqam.",
    })
    .nullable();

export const locationFormSchema = z
  .object({
    name: z.object({
      uz: z
        .string()
        .trim()
        .min(2, "Klinika nomini kiriting.")
        .max(SERVICE_NAME_MAX, `${SERVICE_NAME_MAX} belgidan oshmasin.`),
      ru: text(SERVICE_NAME_MAX),
      en: text(SERVICE_NAME_MAX),
    }),
    address: i18n(LOCATION_ADDRESS_MAX),
    /** E.164 or `""` (none). */
    phone: z
      .string()
      .trim()
      .refine((value) => value === "" || PHONE_PATTERN.test(value), {
        error: "Telefon raqamini to‘g‘ri kiriting.",
      }),
    latitude: coordinate(90),
    longitude: coordinate(180),
  })
  .superRefine((values, ctx) => {
    if ((values.latitude === null) !== (values.longitude === null)) {
      ctx.addIssue({
        code: "custom",
        path: [values.latitude === null ? "latitude" : "longitude"],
        message: "Kenglik va uzunlikni birga kiriting.",
      });
    }
  });
export type LocationFormValues = z.infer<typeof locationFormSchema>;
