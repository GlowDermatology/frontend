"use client";

import { useEffect, useRef, useState } from "react";

import { Button, buttonStyles } from "@/components/ui/button";
import type { SocialProvider } from "@/domain/shop-account";
import type { Locale } from "@/lib/i18n/locales";

import { authCopy } from "../copy/auth";
import type { SocialConfig } from "./social-config";

/**
 * Web sign-in with Google, Facebook and Apple (backend B-W1: the same
 * `auth/social/` endpoints, web client ids):
 *
 * - **Google** — Google Identity Services renders its own button (only it can
 *   open the ID-token popup), laid invisibly over a button drawn like the
 *   Facebook and Apple ones, so all three (and the staff sign-in) look alike;
 *   the ID token carries our single-use nonce (`auth/social/nonce/`, bound to
 *   this browser's device id), fetched before the button is initialised and
 *   renewed after every attempt.
 * - **Facebook** — the JS SDK's `FB.login` gives a user access token (no
 *   nonce: the token is bound to our app id).
 * - **Apple** — Sign in with Apple JS in popup mode (the session cookies are
 *   `SameSite=Lax`, so a cross-site `form_post` back to us would arrive
 *   without them): the ID token's nonce is SHA-256(hex) of ours, and the
 *   authorization code goes to the API, which exchanges it with the
 *   registered redirect URI.
 *
 * Every SDK is loaded only when its provider is configured and only on the
 * page that shows the buttons.
 */

export interface SocialToken {
  provider: SocialProvider;
  token: string;
  tokenType: "id_token" | "access_token";
  nonce: string | null;
  authorizationCode: string | null;
  /** Apple sends the name only on the first authorisation. */
  name: string | null;
}

interface GoogleId {
  initialize(options: Record<string, unknown>): void;
  renderButton(element: HTMLElement, options: Record<string, unknown>): void;
}
interface FacebookSdk {
  init(options: Record<string, unknown>): void;
  login(
    callback: (response: { authResponse?: { accessToken?: string } | null }) => void,
    options?: Record<string, unknown>,
  ): void;
}
interface AppleIdAuth {
  init(options: Record<string, unknown>): void;
  signIn(): Promise<{
    authorization?: { code?: string; id_token?: string };
    user?: { name?: { firstName?: string; lastName?: string } };
  }>;
}

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleId } };
    FB?: FacebookSdk;
    AppleID?: { auth?: AppleIdAuth };
  }
}

const scripts = new Map<string, Promise<void>>();

export function loadScript(src: string): Promise<void> {
  const known = scripts.get(src);
  if (known) return known;
  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scripts.delete(src);
      reject(new Error(`could not load ${src}`));
    };
    document.head.appendChild(script);
  });
  scripts.set(src, promise);
  return promise;
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

const GOOGLE_LOCALE: Record<Locale, string> = { uz: "uz", ru: "ru", en: "en" };
const FACEBOOK_LOCALE: Record<Locale, string> = { uz: "uz_UZ", ru: "ru_RU", en: "en_US" };
const APPLE_LOCALE: Record<Locale, string> = { uz: "en_US", ru: "ru_RU", en: "en_US" };

/** Google's own button is at most 400 px wide and 40 px high ("large"). */
const GOOGLE_BUTTON_MAX_WIDTH = 400;
const GOOGLE_BUTTON_HEIGHT = 40;

function GoogleButton({
  locale,
  clientId,
  label,
  getNonce,
  onToken,
  onError,
  disabled,
}: {
  locale: Locale;
  clientId: string;
  label: string;
  getNonce: () => Promise<string | null>;
  onToken: (token: SocialToken) => void;
  onError: () => void;
  disabled: boolean;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const holder = useRef<HTMLDivElement>(null);
  const [round, setRound] = useState(0);
  const callbacks = useRef({ onToken, onError, getNonce });
  useEffect(() => {
    callbacks.current = { onToken, onError, getNonce };
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await loadScript("https://accounts.google.com/gsi/client");
        const nonce = await callbacks.current.getNonce();
        const id = window.google?.accounts?.id;
        if (cancelled || !nonce || !id || !holder.current || !frame.current) return;
        id.initialize({
          client_id: clientId,
          nonce,
          ux_mode: "popup",
          use_fedcm_for_button: true,
          callback: (response: { credential?: string }) => {
            if (response.credential) {
              callbacks.current.onToken({
                provider: "google",
                token: response.credential,
                tokenType: "id_token",
                nonce,
                authorizationCode: null,
                name: null,
              });
            } else {
              callbacks.current.onError();
            }
            // The nonce is single-use: the next attempt needs a fresh one.
            setRound((value) => value + 1);
          },
        });
        const width = frame.current.offsetWidth || 320;
        const height = frame.current.offsetHeight || GOOGLE_BUTTON_HEIGHT;
        const drawn = Math.min(GOOGLE_BUTTON_MAX_WIDTH, width);
        holder.current.replaceChildren();
        id.renderButton(holder.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          shape: "rectangular",
          text: "continue_with",
          locale: GOOGLE_LOCALE[locale],
          width: drawn,
        });
        // Stretch the invisible button over the whole visible one, so every pixel of it is clickable.
        holder.current.style.transform = `scale(${width / drawn}, ${height / GOOGLE_BUTTON_HEIGHT})`;
      } catch {
        if (!cancelled) callbacks.current.onError();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clientId, locale, round]);

  return (
    <div
      ref={frame}
      aria-disabled={disabled || undefined}
      className="group relative w-full [&[aria-disabled]]:pointer-events-none [&[aria-disabled]]:opacity-60"
    >
      {/* What the visitor sees; hover and focus come from Google's button above it. */}
      <span
        aria-hidden="true"
        className={buttonStyles({
          variant: "secondary",
          size: "lg",
          className:
            "pointer-events-none w-full group-focus-within:outline-2 group-focus-within:outline-offset-2 group-focus-within:outline-gold group-hover:bg-surface",
        })}
      >
        <ProviderMark provider="google" />
        {label}
      </span>
      {/* Google's real button (an iframe: it alone can open the sign-in popup), kept invisible. */}
      <div
        className="absolute inset-0 flex items-center justify-center overflow-hidden [color-scheme:light] opacity-[0.01]"
        title={label}
      >
        <div ref={holder} className="flex shrink-0 justify-center" />
      </div>
    </div>
  );
}

function ProviderMark({ provider }: { provider: SocialProvider }) {
  if (provider === "google") {
    return (
      <svg aria-hidden="true" focusable="false" width="20" height="20" viewBox="0 0 48 48">
        <path
          fill="#EA4335"
          d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
        />
        <path
          fill="#4285F4"
          d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
        />
        <path
          fill="#FBBC05"
          d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
        />
        <path
          fill="#34A853"
          d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
        />
      </svg>
    );
  }
  if (provider === "facebook") {
    return (
      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="11" fill="#1877F2" />
        <path
          fill="#fff"
          d="M13.4 19.5v-6h2l.3-2.4h-2.3V9.6c0-.7.2-1.2 1.2-1.2h1.3V6.3a17 17 0 0 0-1.9-.1c-1.9 0-3.1 1.1-3.1 3.2v1.8H8.8v2.4h2.1v6z"
        />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" width="18" height="20" viewBox="0 0 17 20">
      <path
        fill="currentColor"
        d="M14.1 10.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9C3.6 4.8 2 5.9 1.1 7.5c-1.8 3.1-.5 7.8 1.3 10.3.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8 1.6 0 2 .8 3.4.8 1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9 0 0-2.7-1-2.7-4.4zM11.6 3c.7-.9 1.2-2 1.1-3.1-1 0-2.2.7-2.9 1.5-.6.7-1.2 1.9-1 3 1.1.1 2.2-.6 2.8-1.4z"
      />
    </svg>
  );
}

export function SocialButtons({
  locale,
  config,
  getNonce,
  onToken,
  onError,
  pending,
}: {
  locale: Locale;
  config: SocialConfig;
  getNonce: () => Promise<string | null>;
  onToken: (token: SocialToken) => void;
  onError: () => void;
  pending: boolean;
}) {
  const copy = authCopy[locale].social;
  const [busy, setBusy] = useState<SocialProvider | null>(null);

  const facebook = async () => {
    if (!config.facebook) return;
    setBusy("facebook");
    try {
      await loadScript(`https://connect.facebook.net/${FACEBOOK_LOCALE[locale]}/sdk.js`);
      const fb = window.FB;
      if (!fb) throw new Error("FB SDK missing");
      fb.init({ appId: config.facebook.appId, version: "v21.0", xfbml: false, cookie: false });
      const token = await new Promise<string | null>((resolve) =>
        fb.login((response) => resolve(response.authResponse?.accessToken ?? null), {
          scope: "public_profile,email",
        }),
      );
      if (token) {
        onToken({
          provider: "facebook",
          token,
          tokenType: "access_token",
          nonce: null,
          authorizationCode: null,
          name: null,
        });
      }
    } catch {
      onError();
    } finally {
      setBusy(null);
    }
  };

  const apple = async () => {
    if (!config.apple) return;
    setBusy("apple");
    try {
      const nonce = await getNonce();
      if (!nonce) return;
      await loadScript(
        `https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/${APPLE_LOCALE[locale]}/appleid.auth.js`,
      );
      const auth = window.AppleID?.auth;
      if (!auth) throw new Error("Apple JS missing");
      auth.init({
        clientId: config.apple.servicesId,
        scope: "name email",
        redirectURI: config.apple.redirectUri,
        state: crypto.randomUUID(),
        nonce: await sha256Hex(nonce),
        usePopup: true,
      });
      const response = await auth.signIn();
      const idToken = response.authorization?.id_token;
      const code = response.authorization?.code;
      if (!idToken || !code) throw new Error("Apple answered without a token");
      const name = [response.user?.name?.firstName, response.user?.name?.lastName]
        .filter(Boolean)
        .join(" ");
      onToken({
        provider: "apple",
        token: idToken,
        tokenType: "id_token",
        nonce,
        authorizationCode: code,
        name: name || null,
      });
    } catch (error) {
      // The visitor closing Apple's popup is not an error worth showing.
      const closed =
        typeof error === "object" &&
        error !== null &&
        "error" in error &&
        (error as { error?: string }).error === "popup_closed_by_user";
      if (!closed) onError();
    } finally {
      setBusy(null);
    }
  };

  if (!config.google && !config.facebook && !config.apple) return null;
  return (
    <div className="flex flex-col gap-2.5">
      {config.google ? (
        <GoogleButton
          locale={locale}
          clientId={config.google.clientId}
          label={copy.continueWith.google}
          getNonce={getNonce}
          onToken={onToken}
          onError={onError}
          disabled={pending}
        />
      ) : null}
      {config.facebook ? (
        <Button
          variant="secondary"
          size="lg"
          className="w-full"
          onClick={() => void facebook()}
          disabled={pending || busy !== null}
          aria-busy={busy === "facebook" || undefined}
        >
          <ProviderMark provider="facebook" />
          {busy === "facebook" ? copy.loading : copy.continueWith.facebook}
        </Button>
      ) : null}
      {config.apple ? (
        <Button
          variant="secondary"
          size="lg"
          className="w-full"
          onClick={() => void apple()}
          disabled={pending || busy !== null}
          aria-busy={busy === "apple" || undefined}
        >
          <ProviderMark provider="apple" />
          {busy === "apple" ? copy.loading : copy.continueWith.apple}
        </Button>
      ) : null}
    </div>
  );
}
