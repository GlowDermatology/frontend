import { z } from "zod";

import {
  BLOCK_LABEL_MAX,
  DURATION_MAX,
  DURATION_MIN,
  EXPERIENCE_MAX,
  LOCATION_ADDRESS_MAX,
  LOCATION_DIRECTIONS_MAX,
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
  TIME_PATTERN,
} from "@/domain/clinic";
import { clinicDataCopy } from "@/domain/copy/clinic";
import { SPECIALIST_SLUG_MAX } from "@/domain/seo";
import { localized, type LocalizedOf } from "@/lib/i18n/localized";
import { validationCopy } from "@/lib/i18n/validation-copy";
import { PHONE_PATTERN } from "@/lib/phone";

import { slugFieldSchema } from "./products.schema";

/**
 * Validation of the specialists, services, schedules and clinic forms
 * (contract §2.17), shared by the forms and the Server Actions, one set per
 * admin language (`clinicSchemas[locale]`, messages from `clinicDataCopy`
 * and the shared `validationCopy`). The server stays the authority
 * (overlaps, the date window, races); these rules catch what the form can
 * know.
 */
export const clinicSchemas = localized((locale) => {
  const m = clinicDataCopy[locale];
  const v = validationCopy[locale];
  const text = (max: number) => z.string().trim().max(max, v.maxChars(max));
  const i18n = (max: number) => z.object({ uz: text(max), ru: text(max), en: text(max) });
  const integer = (min: number, max: number) =>
    z
      .number({ error: v.integer })
      .int(v.integer)
      .min(min, m.valueMin(String(min)))
      .max(max, m.valueMax(String(max)));
  const time = z
    .string()
    .trim()
    .regex(TIME_PATTERN, m.timeFormat)
    .refine(onGrid, { error: m.grid });
  const price = z
    .number({ error: v.integer })
    .int(v.integer)
    .min(0, m.priceMin)
    .max(PRICE_MAX, m.priceTooLarge);
  const duration = integer(DURATION_MIN, DURATION_MAX).refine((value) => value % 5 === 0, {
    error: m.durationGrid,
  });
  const isoDate = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, v.chooseDate)
    .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), { error: v.chooseDate });

  const locationId = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/, m.chooseClinic);

  /* --- Specialist profile --- */
  const specialist = z
    .object({
      name: z
        .string()
        .trim()
        .min(NAME_MIN, v.minChars(NAME_MIN))
        .max(NAME_MAX, v.maxChars(NAME_MAX)),
      /** `""` only while a draft has no discipline yet (never sent back to the API). */
      role: z.enum(SPECIALIST_ROLES, { error: m.chooseRole }).or(z.literal("")),
      qualifications: i18n(TEXT_MAX),
      bio: i18n(TEXT_MAX),
      experienceYears: integer(0, EXPERIENCE_MAX).nullable(),
      slotStepMin: z.union(
        SLOT_STEPS.map((step) => z.literal(step)) as unknown as [
          z.ZodLiteral<10>,
          z.ZodLiteral<15>,
          z.ZodLiteral<20>,
          z.ZodLiteral<30>,
          z.ZodLiteral<60>,
        ],
        { error: m.slotSteps },
      ),
      /** The primary clinic, `""` while a draft has none. */
      locationId: locationId.or(z.literal("")),
      /** Empty only while a draft has no clinic yet. */
      locationIds: z.array(locationId),
      isActive: z.boolean(),
      /** The website URL segment (B-W1); `""` on create = derived from the name. */
      slug: slugFieldSchema(SPECIALIST_SLUG_MAX, locale),
    })
    .refine(
      (values) =>
        values.locationIds.length === 0
          ? values.locationId === ""
          : values.locationIds.includes(values.locationId),
      { path: ["locationId"], message: m.chooseClinic },
    );

  /* --- Offered services --- */
  const offers = z.object({
    services: z
      .array(
        z.object({
          serviceId: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/, m.chooseService),
          price: z
            .number({ error: m.enterPrice })
            .int(v.integer)
            .min(0, m.priceMin)
            .max(PRICE_MAX, m.priceTooLarge),
          /** `null` = the service's default duration. */
          durationMin: duration.nullable(),
          isActive: z.boolean(),
        }),
      )
      .max(50, m.atMost(50))
      .superRefine((rows, ctx) => {
        const seen = new Set<string>();
        rows.forEach((row, index) => {
          if (seen.has(row.serviceId)) {
            ctx.addIssue({ code: "custom", path: [index, "serviceId"], message: m.serviceTwice });
          }
          seen.add(row.serviceId);
        });
      }),
  });

  /* --- Weekly hours --- */
  const week = z.object({
    days: z
      .array(
        z
          .object({
            weekday: z.number().int().min(0).max(6),
            locationId,
            start: time,
            end: time,
            breakStart: time.nullable(),
            breakEnd: time.nullable(),
          })
          .superRefine((day, ctx) => {
            if (minutesOf(day.end) <= minutesOf(day.start)) {
              ctx.addIssue({ code: "custom", path: ["end"], message: m.endAfterStart });
            }
            if ((day.breakStart === null) !== (day.breakEnd === null)) {
              ctx.addIssue({
                code: "custom",
                path: [day.breakStart === null ? "breakStart" : "breakEnd"],
                message: m.breakBoth,
              });
              return;
            }
            if (day.breakStart && day.breakEnd) {
              if (minutesOf(day.breakEnd) <= minutesOf(day.breakStart)) {
                ctx.addIssue({ code: "custom", path: ["breakEnd"], message: m.endAfterStart });
              } else if (
                minutesOf(day.breakStart) < minutesOf(day.start) ||
                minutesOf(day.breakEnd) > minutesOf(day.end)
              ) {
                ctx.addIssue({ code: "custom", path: ["breakStart"], message: m.breakInside });
              }
            }
          }),
      )
      .max(7, m.atMost(7))
      .refine((days) => new Set(days.map((d) => d.weekday)).size === days.length, {
        error: m.weekdayTwice,
      }),
  });

  /* --- Date overrides and blocked periods --- */
  const override = z
    .object({
      date: isoDate,
      dayOff: z.boolean(),
      locationId: z.string(),
      start: z.string().trim(),
      end: z.string().trim(),
      note: text(OVERRIDE_NOTE_MAX),
    })
    .superRefine((values, ctx) => {
      if (values.dayOff) return;
      if (!locationId.safeParse(values.locationId).success) {
        ctx.addIssue({ code: "custom", path: ["locationId"], message: m.chooseClinic });
      }
      for (const field of ["start", "end"] as const) {
        const value = values[field];
        if (!TIME_PATTERN.test(value)) {
          ctx.addIssue({ code: "custom", path: [field], message: m.timeFormat });
        } else if (!onGrid(value)) {
          ctx.addIssue({ code: "custom", path: [field], message: m.grid });
        }
      }
      if (
        TIME_PATTERN.test(values.start) &&
        TIME_PATTERN.test(values.end) &&
        minutesOf(values.end) <= minutesOf(values.start)
      ) {
        ctx.addIssue({ code: "custom", path: ["end"], message: m.endAfterStart });
      }
    });

  /** Aware ISO datetimes in Tashkent time (`…+05:00`) from the block form's date and time inputs. */
  const block = z
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
        ctx.addIssue({ code: "custom", path: ["endTime"], message: m.endAfterStart });
      }
    });

  /* --- Services --- */
  const service = z.object({
    name: z.object({
      uz: z
        .string()
        .trim()
        .min(2, v.minChars(2))
        .max(SERVICE_NAME_MAX, v.maxChars(SERVICE_NAME_MAX)),
      ru: text(SERVICE_NAME_MAX),
      en: text(SERVICE_NAME_MAX),
    }),
    /** `""` on create = the first 40 characters of `name.uz` (the server's default). */
    shortName: i18n(SERVICE_SHORT_MAX),
    description: i18n(TEXT_MAX),
    category: z.enum(SERVICE_CATEGORIES, { error: m.chooseCategory }),
    defaultDurationMin: duration,
    defaultPrice: price.nullable(),
    isActive: z.boolean(),
  });

  /* --- Clinics --- */
  const coordinate = (limit: number) =>
    z
      .number({ error: m.enterNumber })
      .min(-limit, m.valueMin(`−${limit}`))
      .max(limit, m.valueMax(String(limit)))
      .refine((value) => Math.round(value * 1e6) / 1e6 === value, { error: m.maxDecimals })
      .nullable();

  const location = z
    .object({
      name: z.object({
        uz: z
          .string()
          .trim()
          .min(2, m.clinicName)
          .max(SERVICE_NAME_MAX, v.maxChars(SERVICE_NAME_MAX)),
        ru: text(SERVICE_NAME_MAX),
        en: text(SERVICE_NAME_MAX),
      }),
      address: i18n(LOCATION_ADDRESS_MAX).extend({
        uz: text(LOCATION_ADDRESS_MAX).min(1, m.clinicAddress),
      }),
      directions: i18n(LOCATION_DIRECTIONS_MAX),
      isActive: z.boolean(),
      /** E.164 or `""` (none). */
      phone: z
        .string()
        .trim()
        .refine((value) => value === "" || PHONE_PATTERN.test(value), { error: v.phone }),
      latitude: coordinate(90),
      longitude: coordinate(180),
    })
    .superRefine((values, ctx) => {
      if ((values.latitude === null) !== (values.longitude === null)) {
        ctx.addIssue({
          code: "custom",
          path: [values.latitude === null ? "latitude" : "longitude"],
          message: m.coordinatesBoth,
        });
      }
    });

  return { specialist, offers, week, override, block, service, location };
});

type ClinicSchemas = LocalizedOf<typeof clinicSchemas>;

export type SpecialistFormValues = z.infer<ClinicSchemas["specialist"]>;
export type OfferedServicesValues = z.infer<ClinicSchemas["offers"]>;
export type WorkingWeekValues = z.infer<ClinicSchemas["week"]>;
export type OverrideFormValues = z.infer<ClinicSchemas["override"]>;
export type BlockFormValues = z.infer<ClinicSchemas["block"]>;
export type ServiceFormValues = z.infer<ClinicSchemas["service"]>;
export type LocationFormValues = z.infer<ClinicSchemas["location"]>;

/** The Uzbek schemas under their earlier names (tests, older callers). */
export const specialistFormSchema = clinicSchemas.uz.specialist;
export const workingWeekSchema = clinicSchemas.uz.week;

export const EMPTY_SPECIALIST: SpecialistFormValues = {
  name: "",
  role: "",
  qualifications: { uz: "", ru: "", en: "" },
  bio: { uz: "", ru: "", en: "" },
  experienceYears: null,
  slotStepMin: 30,
  locationId: "",
  locationIds: [],
  // A draft profile starts unpublished (staff complete it, then publish).
  isActive: false,
  slug: "",
};

export function blockStart(values: BlockFormValues): string {
  return `${values.startDate}T${values.startTime}:00+05:00`;
}
export function blockEnd(values: BlockFormValues): string {
  return `${values.endDate}T${values.endTime}:00+05:00`;
}

export const EMPTY_SERVICE: ServiceFormValues = {
  name: { uz: "", ru: "", en: "" },
  shortName: { uz: "", ru: "", en: "" },
  description: { uz: "", ru: "", en: "" },
  category: "dermatology",
  defaultDurationMin: 30,
  defaultPrice: null,
  isActive: true,
};
