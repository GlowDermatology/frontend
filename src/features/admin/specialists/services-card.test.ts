import { describe, expect, it } from "vitest";

import { clinicSchemas, EMPTY_SPECIALIST_SERVICE } from "@/data/clinic.schema";
import type { SpecialistService } from "@/domain/clinic";

import { SERVICE_FIELDS, serviceFieldLabel, serviceFormValues } from "./service-dialog";
import { isBookedConflict, serviceText, sortServices } from "./services-card";
import { servicesCardCopy } from "./services-copy";

const text = (uz: string, ru = "", en = "") => ({ uz, ru, en });

function service(overrides: Partial<SpecialistService> = {}): SpecialistService {
  return {
    id: "1",
    specialistId: "7",
    name: text("Yuz tozalash", "Чистка лица", "Facial cleansing"),
    shortName: text("Tozalash"),
    description: text("Chuqur tozalash"),
    category: "cosmetology",
    price: 350_000,
    durationMin: 60,
    position: 0,
    isActive: true,
    createdAt: "2026-11-01T09:00:00+05:00",
    updatedAt: "2026-11-01T09:00:00+05:00",
    ...overrides,
  };
}

describe("serviceText", () => {
  it("uses the admin language and falls back to Uzbek", () => {
    expect(serviceText(text("Yuz", "Лицо"), "ru")).toBe("Лицо");
    expect(serviceText(text("Yuz", "  "), "ru")).toBe("Yuz");
    expect(serviceText(text("Yuz"), "en")).toBe("Yuz");
  });
});

describe("sortServices", () => {
  it("orders by position, then by numeric id, without touching the input", () => {
    const input = [
      service({ id: "10", position: 1 }),
      service({ id: "9", position: 1 }),
      service({ id: "3", position: 0 }),
    ];
    expect(sortServices(input).map((s) => s.id)).toEqual(["3", "9", "10"]);
    expect(input.map((s) => s.id)).toEqual(["10", "9", "3"]);
  });
});

describe("isBookedConflict", () => {
  it("is the 409 conflict of a booked service only", () => {
    expect(isBookedConflict({ code: "conflict" })).toBe(true);
    expect(isBookedConflict({ code: "not_found" })).toBe(false);
    expect(isBookedConflict({})).toBe(false);
  });
});

describe("serviceFormValues", () => {
  it("copies a service into the form (no shared objects)", () => {
    const source = service();
    const values = serviceFormValues(source);
    expect(values).toEqual({
      name: source.name,
      shortName: source.shortName,
      description: source.description,
      category: "cosmetology",
      price: 350_000,
      durationMin: 60,
      isActive: true,
    });
    values.name.uz = "Boshqa";
    expect(source.name.uz).toBe("Yuz tozalash");
  });

  it("starts a new service from a fresh empty copy", () => {
    const values = serviceFormValues(null);
    expect(values).toEqual(EMPTY_SPECIALIST_SERVICE);
    expect(values.name).not.toBe(EMPTY_SPECIALIST_SERVICE.name);
  });
});

describe("serviceFieldLabel", () => {
  it("names every dialog field in each admin language", () => {
    for (const locale of ["uz", "ru", "en"] as const) {
      for (const field of SERVICE_FIELDS) {
        expect(serviceFieldLabel(field, servicesCardCopy[locale])).toBeTruthy();
      }
    }
    expect(serviceFieldLabel("name.ru", servicesCardCopy.uz)).toBe("Nomi (ruscha)");
    expect(serviceFieldLabel("price", servicesCardCopy.en)).toBe("Price");
    expect(serviceFieldLabel("unknown", servicesCardCopy.en)).toBeUndefined();
  });
});

describe("specialistService schema", () => {
  const schema = clinicSchemas.uz.specialistService;
  const valid = { ...serviceFormValues(service()) };

  it("accepts a free service and requires a price and a duration on the grid", () => {
    expect(schema.safeParse({ ...valid, price: 0 }).success).toBe(true);
    const failed = schema.safeParse({ ...valid, price: Number.NaN, durationMin: 32 });
    expect(failed.success).toBe(false);
    const paths = failed.error?.issues.map((issue) => issue.path.join("."));
    expect(paths).toEqual(expect.arrayContaining(["price", "durationMin"]));
  });

  it("requires the Uzbek name", () => {
    const failed = schema.safeParse({ ...valid, name: text("") });
    expect(failed.error?.issues[0]?.path.join(".")).toBe("name.uz");
  });
});
