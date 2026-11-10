/**
 * The native app's links (Glow Derma iOS/Android app, `mobile` repository).
 *
 * Click and Payme send a customer who paid in the app back to
 * `https://<SITE_DOMAIN>/pay/return?order_id=N` (backend `PAYMENT_RETURN_URL`).
 * The two `.well-known` documents below let iOS (universal links) and Android
 * (App Links) open the app for that path instead of the browser. Their values
 * only exist once the app is registered with Apple and Google, so they come
 * from the environment and the routes answer 404 until they are set.
 */

/** Paths the app claims; everything else stays on the website. */
export const APP_LINK_PATH = "/pay/return";

/** The app's custom-scheme fallback (backend `PAYMENT_RETURN_FALLBACK_URL`). */
export const APP_SCHEME_RETURN = "glowderma://payment/return";

const APPLE_APP_ID = /^[A-Z0-9]{10}\.[A-Za-z0-9.-]+$/;
const ANDROID_PACKAGE = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;
const SHA256_FINGERPRINT = /^[0-9A-F]{2}(:[0-9A-F]{2}){31}$/;

function list(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/**
 * `GLOWDERMA_APP_LINKS_APPLE_APP_IDS`: comma-separated `<TEAM_ID>.<bundle id>`
 * (e.g. `ABCDE12345.uz.glowderma.app`). Invalid entries are dropped.
 */
export function appleAppIds(value: string | undefined): string[] {
  return list(value).filter((id) => APPLE_APP_ID.test(id));
}

/**
 * `GLOWDERMA_APP_LINKS_ANDROID_SHA256`: comma-separated SHA-256 fingerprints
 * of the app's signing certificates (Play App Signing key, plus the upload key
 * for builds installed outside the Play Store), `AA:BB:…` (32 bytes).
 */
export function androidFingerprints(value: string | undefined): string[] {
  return list(value)
    .map((fp) => fp.toUpperCase())
    .filter((fp) => SHA256_FINGERPRINT.test(fp));
}

/** `GLOWDERMA_APP_LINKS_ANDROID_PACKAGE`, default `uz.glowderma.app`. */
export function androidPackage(value: string | undefined): string | null {
  const pkg = (value ?? "").trim() || "uz.glowderma.app";
  return ANDROID_PACKAGE.test(pkg) ? pkg : null;
}

/** `/.well-known/apple-app-site-association`, or null when not configured. */
export function appleAppSiteAssociation(appIds: string[]): object | null {
  if (appIds.length === 0) return null;
  return {
    applinks: {
      details: [
        {
          appIDs: appIds,
          components: [{ "/": APP_LINK_PATH, comment: "Payment provider return" }],
        },
      ],
    },
  };
}

/** `/.well-known/assetlinks.json`, or null when not configured. */
export function assetLinks(pkg: string | null, fingerprints: string[]): object[] | null {
  if (!pkg || fingerprints.length === 0) return null;
  return [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: pkg,
        sha256_cert_fingerprints: fingerprints,
      },
    },
  ];
}

/** The order id of a return link: digits only, or null. */
export function returnOrderId(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw && /^\d{1,12}$/.test(raw) ? raw : null;
}

/** The custom-scheme URL that opens the app on the order. */
export function appReturnUrl(orderId: string | null): string {
  return orderId ? `${APP_SCHEME_RETURN}?order_id=${orderId}` : APP_SCHEME_RETURN;
}

/** JSON answer of the `.well-known` routes (404 while not configured). */
export function wellKnownResponse(body: object | null): Response {
  if (body === null) {
    return new Response(JSON.stringify({ code: "not_found" }), {
      status: 404,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=3600" },
  });
}
