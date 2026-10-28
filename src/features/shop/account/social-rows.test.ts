import { describe, expect, it } from "vitest";

import { visibleProviders } from "./social-rows";

describe("visibleProviders", () => {
  it("lists configured or linked providers only", () => {
    expect(
      visibleProviders(
        { linkedProviders: ["apple"] },
        { google: { clientId: "x" }, facebook: null, apple: null },
      ),
    ).toEqual(["google", "apple"]);
    expect(
      visibleProviders({ linkedProviders: [] }, { google: null, facebook: null, apple: null }),
    ).toEqual([]);
  });
});
