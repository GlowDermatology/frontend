import { describe, expect, it } from "vitest";

import {
  LINK_NEEDS_NEW_SIGN_IN_MESSAGE,
  LINK_NEEDS_PASSWORD_MESSAGE,
  linkBlockedMessage,
} from "@/domain/settings";

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
      linkHint: null,
    });
  });

  it("offers no link to a session that did not sign in with the password (M3 auth_method)", () => {
    const block = socialBlock([google, facebook], ["facebook"], "google");
    expect(block).toEqual({
      kind: "rows",
      rows: [
        { id: "google", label: "Google", linked: false, linkHref: null },
        // Unlinking stays available.
        { id: "facebook", label: "Facebook", linked: true, linkHref: null },
      ],
      linkHint: LINK_NEEDS_PASSWORD_MESSAGE,
    });
    expect(socialBlock([google], [], "facebook")).toMatchObject({
      linkHint: LINK_NEEDS_PASSWORD_MESSAGE,
    });
    // A session the backend did not record is refused too, with a neutral hint.
    expect(socialBlock([google], [], null)).toMatchObject({
      rows: [{ id: "google", linkHref: null }],
      linkHint: LINK_NEEDS_NEW_SIGN_IN_MESSAGE,
    });
    expect(socialBlock([google], [], "password")).toMatchObject({
      rows: [{ id: "google", linkHref: "/admin/auth/oauth/google/start?intent=link" }],
      linkHint: null,
    });
  });

  it("needs no hint when every enabled provider is already linked", () => {
    expect(socialBlock([google], ["google"], "google")).toMatchObject({ linkHint: null });
    // A linked provider that is no longer enabled leaves nothing to link.
    expect(socialBlock([], ["facebook"], null)).toMatchObject({ linkHint: null });
  });
});

describe("linkBlockedMessage", () => {
  it("asks every session but a password one to sign in with the password first", () => {
    expect(linkBlockedMessage("password")).toBeNull();
    expect(linkBlockedMessage("google")).toBe(LINK_NEEDS_PASSWORD_MESSAGE);
    expect(linkBlockedMessage("apple")).toBe(LINK_NEEDS_PASSWORD_MESSAGE);
    expect(linkBlockedMessage(null)).toBe(LINK_NEEDS_NEW_SIGN_IN_MESSAGE);
    expect(LINK_NEEDS_PASSWORD_MESSAGE).toMatch(/email va parol bilan qayta kiring/);
  });
});
