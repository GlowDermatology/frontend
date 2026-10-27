import { describe, expect, it } from "vitest";

import {
  parseServiceQuery,
  parseSpecialistQuery,
  serviceListHref,
  specialistListHref,
} from "./query";

describe("specialists and services URL state (contract §2.17)", () => {
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
    expect(parseServiceQuery({ category: "x", sort: "price", size: "100" })).toEqual({
      q: undefined,
      status: undefined,
      category: undefined,
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
      serviceListHref({ category: "cosmetology", sort: "name" }, "/admin/services/export"),
    ).toBe("/admin/services/export?category=cosmetology&sort=name");
  });
});
