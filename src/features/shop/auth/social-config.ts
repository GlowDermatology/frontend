import "server-only";

import type { SocialProvider } from "@/domain/shop-account";

/**
 * Public client ids of the storefront's social sign-in (backend B-W1 web
 * OAuth). Read per request (runtime, no rebuild); a provider without its id
 * is left out — no button, nothing loaded. They are public identifiers,
 * not secrets: the matching secrets stay in Django.
 *
 * - `GLOWDERMA_SHOP_GOOGLE_CLIENT_ID` — Google Identity Services web client
 *   id (Django `GOOGLE_WEB_CLIENT_IDS` must list it).
 * - `GLOWDERMA_SHOP_FACEBOOK_APP_ID` — the Facebook app id (Django
 *   `FACEBOOK_APP_ID`).
 * - `GLOWDERMA_SHOP_APPLE_SERVICES_ID` and `GLOWDERMA_SHOP_APPLE_REDIRECT_URI`
 *   — the Sign in with Apple Services ID (Django `APPLE_SERVICES_IDS`) and
 *   the redirect URI registered for it, which must equal Django's
 *   `APPLE_WEB_REDIRECT_URI` (the code exchange sends it). Both or neither.
 */
export interface SocialConfig {
  google: { clientId: string } | null;
  facebook: { appId: string } | null;
  apple: { servicesId: string; redirectUri: string } | null;
}

function read(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

export function socialConfig(): SocialConfig {
  const google = read("GLOWDERMA_SHOP_GOOGLE_CLIENT_ID");
  const facebook = read("GLOWDERMA_SHOP_FACEBOOK_APP_ID");
  const servicesId = read("GLOWDERMA_SHOP_APPLE_SERVICES_ID");
  const redirectUri = read("GLOWDERMA_SHOP_APPLE_REDIRECT_URI");
  return {
    google: google ? { clientId: google } : null,
    facebook: facebook && /^\d{5,20}$/.test(facebook) ? { appId: facebook } : null,
    apple: servicesId && redirectUri?.startsWith("https://") ? { servicesId, redirectUri } : null,
  };
}

export function enabledProviders(config: SocialConfig): SocialProvider[] {
  return (["google", "facebook", "apple"] as const).filter((provider) => config[provider] !== null);
}
