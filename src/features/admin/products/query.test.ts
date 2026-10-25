import { describe, expect, it } from "vitest";

import { parseProductQuery, productListHref, withKnownCategory } from "./query";

/** The products board's URL state and the unknown-category rule. */

const categories = [{ slug: "serums" }, { slug: "toners" }];

describe("withKnownCategory", () => {
  it("drops a slug that is not a current category (a stale bookmark), keeps known ones and none", () => {
    const stale = parseProductQuery({ category: "deleted-cat", q: "serum" });
    expect(stale.category).toBe("deleted-cat");
    expect(withKnownCategory(stale, categories)).toMatchObject({ category: undefined, q: "serum" });
    const known = parseProductQuery({ category: "toners" });
    expect(withKnownCategory(known, categories)).toBe(known);
    const none = parseProductQuery({ category: "none" });
    expect(withKnownCategory(none, categories).category).toBe("none");
  });

  it("feeds the export link without the stale slug", () => {
    const query = withKnownCategory(parseProductQuery({ category: "gone", out: "1" }), categories);
    expect(productListHref({ ...query, page: undefined }, "/admin/products/export")).toBe(
      "/admin/products/export?out=1",
    );
  });
});
