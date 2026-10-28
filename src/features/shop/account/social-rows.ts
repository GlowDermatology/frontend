import type { SocialProvider } from "@/domain/shop-account";

/**
 * The social providers the account page lists (U16): a provider this
 * storefront has configured, or one already linked to the account (so it can
 * still be unlinked). An unconfigured, unlinked provider is not shown at all.
 */
export function visibleProviders(
  me: { linkedProviders: ReadonlyArray<SocialProvider> },
  config: Record<SocialProvider, unknown>,
): SocialProvider[] {
  return (["google", "facebook", "apple"] as const).filter(
    (provider) => config[provider] !== null || me.linkedProviders.includes(provider),
  );
}
