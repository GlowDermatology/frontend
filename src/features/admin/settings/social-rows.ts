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
  /** The OAuth link flow; `null` when the provider is not enabled (unlink only). */
  linkHref: string | null;
}

const ORDER = ["google", "facebook"];
const LABELS: Record<string, string> = { google: "Google", facebook: "Facebook" };

export function socialRows(
  enabled: readonly SocialProviderOption[],
  linked: readonly string[],
): SocialRow[] {
  const rows = new Map<string, SocialRow>();
  for (const provider of enabled) {
    rows.set(provider.id, {
      ...provider,
      linked: linked.includes(provider.id),
      linkHref: `/admin/auth/oauth/${provider.id}/start?intent=link`,
    });
  }
  for (const id of linked) {
    if (!rows.has(id)) rows.set(id, { id, label: LABELS[id] ?? id, linked: true, linkHref: null });
  }
  const rank = (id: string) => (ORDER.includes(id) ? ORDER.indexOf(id) : ORDER.length);
  return [...rows.values()].sort((a, b) => rank(a.id) - rank(b.id));
}
