import { describe, expect, it } from "vitest";

import { socialRows } from "./social-rows";

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
