import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  LINK_NEEDS_NEW_SIGN_IN_MESSAGE,
  LINK_NEEDS_PASSWORD_MESSAGE,
  type StaffAccount,
} from "@/domain/settings";

import { AccountCard } from "./account-card";

// The card's client hooks and its Server Actions: only the first render is checked here.
vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/settings",
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/components/ui/toast", () => ({ useToast: () => vi.fn() }));
vi.mock("@/data/settings.actions", () => ({
  changePassword: vi.fn(),
  unlinkSocialAccount: vi.fn(),
}));

const PROVIDERS = [
  { id: "google", label: "Google" },
  { id: "facebook", label: "Facebook" },
];

function account(authMethod: StaffAccount["authMethod"]): StaffAccount {
  return {
    id: "1",
    email: "admin@glowderma.uz",
    displayName: "Administrator",
    isManager: true,
    linkedProviders: ["facebook"],
    sessionExpiresAt: null,
    authMethod,
  };
}

/** The card's first render as HTML, with its link targets, unlink buttons and hint. */
function render(authMethod: StaffAccount["authMethod"]) {
  const html = renderToStaticMarkup(
    createElement(AccountCard, { account: account(authMethod), providers: PROVIDERS }),
  );
  return {
    html,
    linkHrefs: [...html.matchAll(/href="(\/admin\/auth\/oauth\/[^"]+)"/g)].map((m) => m[1]),
    unlinks: [...html.matchAll(/aria-label="([^"]+ hisobini uzish)"/g)].map((m) => m[1]),
  };
}

/**
 * The card wires `Me.auth_method` into the social block (a forgotten
 * argument would offer «Bog‘lash» to every session again).
 */
describe("AccountCard social sign-in block", () => {
  it("offers «Bog‘lash» to a password session", () => {
    const card = render("password");
    expect(card.linkHrefs).toEqual(["/admin/auth/oauth/google/start?intent=link"]);
    expect(card.unlinks).toEqual(["Facebook hisobini uzish"]);
    expect(card.html).not.toContain("qayta kiring");
  });

  it("shows the password-first hint instead of «Bog‘lash» to a Google session", () => {
    const card = render("google");
    expect(card.linkHrefs).toEqual([]);
    expect(card.html).not.toContain("hisobini bog‘lash");
    expect(card.html).toContain(LINK_NEEDS_PASSWORD_MESSAGE);
    // Unlinking stays.
    expect(card.unlinks).toEqual(["Facebook hisobini uzish"]);
  });

  it("shows the neutral hint to a session the backend did not record (null)", () => {
    const card = render(null);
    expect(card.linkHrefs).toEqual([]);
    expect(card.html).toContain(LINK_NEEDS_NEW_SIGN_IN_MESSAGE);
  });

  it("keeps «Bog‘lash» when the backend does not report the method (before M3)", () => {
    const card = render(undefined);
    expect(card.linkHrefs).toEqual(["/admin/auth/oauth/google/start?intent=link"]);
    expect(card.html).not.toContain("qayta kiring");
  });

  it("gives every row and the heading a focus target for the end of «Uzish»", () => {
    const card = render("google");
    expect(card.html).toMatch(/<li id="social-row-google" tabindex="-1"/);
    expect(card.html).toMatch(/<li id="social-row-facebook" tabindex="-1"/);
    expect(card.html).toMatch(/<h3 id="social-title" tabindex="-1"/);
  });
});
