import { linkBlockedMessage, type StaffAuthMethod } from "@/domain/settings";

/**
 * The rows of the account card's social sign-in block: every provider
 * enabled on this server (link or unlink), plus a provider that is still
 * linked although no longer enabled, so it can be unlinked. Google first.
 */

export interface SocialProviderOption {
  id: string;
  label: string;
}

export interface SocialRow extends SocialProviderOption {
  linked: boolean;
  /**
   * The OAuth link flow; `null` when this session cannot start one: the
   * provider is not enabled (unlink only) or the session did not sign in
   * with the password (`canLink` false).
   */
  linkHref: string | null;
}

const ORDER = ["google", "facebook"];
const LABELS: Record<string, string> = { google: "Google", facebook: "Facebook" };

export function socialRows(
  enabled: readonly SocialProviderOption[],
  linked: readonly string[],
  canLink = true,
): SocialRow[] {
  const rows = new Map<string, SocialRow>();
  for (const provider of enabled) {
    rows.set(provider.id, {
      ...provider,
      linked: linked.includes(provider.id),
      linkHref: canLink ? `/admin/auth/oauth/${provider.id}/start?intent=link` : null,
    });
  }
  for (const id of linked) {
    if (!rows.has(id)) rows.set(id, { id, label: LABELS[id] ?? id, linked: true, linkHref: null });
  }
  const rank = (id: string) => (ORDER.includes(id) ? ORDER.indexOf(id) : ORDER.length);
  return [...rows.values()].sort((a, b) => rank(a.id) - rank(b.id));
}

export type SocialBlock =
  | { kind: "off" }
  | { kind: "unknown" }
  | {
      kind: "rows";
      rows: SocialRow[];
      /** Why an enabled, unlinked provider offers no «Bog‘lash»; `null` when it does. */
      linkHint: string | null;
    };

/**
 * What the social block shows: `off` when no provider is enabled or linked,
 * `unknown` when the account could not be loaded (`auth/me/` failed) — the
 * card must not claim "Bog‘lanmagan" and offer a link that would end in a
 * 409 — and the rows otherwise. Only a session that signed in with the
 * password may link (`Me.auth_method`, M3; Django refuses `link/` with 403
 * otherwise): any other session gets no «Bog‘lash» and, while a provider is
 * left to link, the password-first hint instead. Unlinking is not affected.
 */
export function socialBlock(
  enabled: readonly SocialProviderOption[],
  linked: readonly string[] | null,
  authMethod: StaffAuthMethod | null = "password",
): SocialBlock {
  if (linked === null) return enabled.length > 0 ? { kind: "unknown" } : { kind: "off" };
  const hint = linkBlockedMessage(authMethod);
  const rows = socialRows(enabled, linked, hint === null);
  if (rows.length === 0) return { kind: "off" };
  const linkable = enabled.some((provider) => !linked.includes(provider.id));
  return { kind: "rows", rows, linkHint: linkable ? hint : null };
}
