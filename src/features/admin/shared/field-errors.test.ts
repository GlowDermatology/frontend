import { describe, expect, it } from "vitest";

import { partitionFieldErrors } from "./field-errors";

describe("partitionFieldErrors", () => {
  it("falls back to the top-level error when there are no field errors", () => {
    expect(partitionFieldErrors({ error: "Kutilmagan xato." }, ["title"])).toEqual({
      fieldErrors: {},
      formError: "Kutilmagan xato.",
    });
  });

  it("keeps rendered field errors and shows nothing at form level", () => {
    expect(
      partitionFieldErrors(
        { error: "Ma’lumotlar noto‘g‘ri.", fieldErrors: { title: "Juda qisqa." } },
        ["title", "body"],
      ),
    ).toEqual({ fieldErrors: { title: "Juda qisqa." }, formError: null });
  });

  it("surfaces a field error the form does not render (stale product link)", () => {
    expect(
      partitionFieldErrors(
        {
          error: "Ma’lumotlar noto‘g‘ri.",
          fieldErrors: { link: "Mahsulot topilmadi yoki yashirin.", title: "Juda qisqa." },
        },
        ["title"],
      ),
    ).toEqual({
      fieldErrors: { title: "Juda qisqa." },
      formError: "Mahsulot topilmadi yoki yashirin.",
    });
  });

  it("joins distinct unrendered messages once", () => {
    expect(
      partitionFieldErrors(
        { error: "x", fieldErrors: { serviceId: "A.", kind: "A.", texts: "B." } },
        [],
      ).formError,
    ).toBe("A. B.");
  });
});
