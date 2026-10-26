import { describe, expect, it } from "vitest";

import { socialBlock, socialRows } from "./social-rows";

const google = { id: "google", label: "Google" };
const facebook = { id: "facebook", label: "Facebook" };

describe("socialRows", () => {
  it("offers a link for every enabled provider and an unlink for a linked one", () => {
    expect(socialRows([facebook, google], ["facebook"])).toEqual([
      {
        id: "google",
        label: "Google",
        linked: false,
        linkHref: "/admin/auth/oauth/google/start?intent=link",
      },
      {
        id: "facebook",
        label: "Facebook",
        linked: true,
        linkHref: "/admin/auth/oauth/facebook/start?intent=link",
      },
    ]);
  });

  it("keeps a linked provider that is no longer enabled, unlink only", () => {
    expect(socialRows([], ["google"])).toEqual([
      { id: "google", label: "Google", linked: true, linkHref: null },
    ]);
    expect(socialRows([], [])).toEqual([]);
  });
});

describe("socialBlock", () => {
  it("shows no link state when the account could not be loaded", () => {
    expect(socialBlock([google, facebook], null)).toEqual({ kind: "unknown" });
    expect(socialBlock([], null)).toEqual({ kind: "off" });
  });

  it("is off without providers and lists the rows otherwise", () => {
    expect(socialBlock([], [])).toEqual({ kind: "off" });
    expect(socialBlock([google], [])).toEqual({
      kind: "rows",
      rows: [
        {
          id: "google",
          label: "Google",
          linked: false,
          linkHref: "/admin/auth/oauth/google/start?intent=link",
        },
      ],
    });
  });
});
