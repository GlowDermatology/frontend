import { describe, expect, it } from "vitest";

import { parseSpecialistQuery, specialistListHref } from "./query";

describe("specialists URL state (contract §2.17)", () => {
  it("keeps the known filters, sorts and sizes only", () => {
    expect(
      parseSpecialistQuery({
        q: " Nod ",
        status: "inactive",
        role: "cosmetologist",
        sort: "-name",
        page: "2",
        size: "50",
      }),
    ).toEqual({
      q: "Nod",
      status: "inactive",
      role: "cosmetologist",
      sort: "-name",
      page: 2,
      pageSize: 50,
    });
    expect(parseSpecialistQuery({ role: "x", sort: "price", size: "100" })).toEqual({
      q: undefined,
      status: undefined,
      role: undefined,
      sort: "position",
      page: 1,
      pageSize: 20,
    });
  });

  it("omits defaults in the links", () => {
    expect(specialistListHref({ sort: "position", page: 1, pageSize: 20 })).toBe(
      "/admin/specialists",
    );
    expect(
      specialistListHref({ role: "cosmetologist", sort: "name" }, "/admin/specialists/export"),
    ).toBe("/admin/specialists/export?role=cosmetologist&sort=name");
  });
});
