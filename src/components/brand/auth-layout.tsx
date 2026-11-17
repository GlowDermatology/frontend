import type { ReactNode } from "react";

import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

import { AuthArtwork } from "./auth-artwork";
import { AudienceSwitch, type AudienceSwitchLinks, type AuthAudience } from "./audience-switch";

export interface AuthPoint {
  icon: IconName;
  text: ReactNode;
}

export interface AuthLayoutProps {
  audience: AuthAudience;
  /**
   * `page`: the whole viewport (staff sign-in, set-password, change-password, the MFA step — no
   * other chrome). `embedded`: inside a page's `<main>` (the storefront's `ShopChrome`).
   */
  frame?: "page" | "embedded";
  /** «Mijoz | Xodim»; omitted → no switch (e.g. the storefront is off, or a later step). */
  switchLinks?: AudienceSwitchLinks | null;
  /**
   * `always`, or `first-step`: shown only while the card holds a first step — an element with
   * `role="tablist"` (the customer panel's sign-in / sign-up tabs) or `data-auth-first-step`
   * (a skeleton standing in for it). Later steps (codes, new password) hide it without the
   * form having to know about the switch.
   */
  switchVisibility?: "always" | "first-step";
  /** Over the art panel from the `nav` breakpoint: an overline, a serif line and up to 3 points. */
  eyebrow?: ReactNode;
  headline?: ReactNode;
  points?: ReadonlyArray<AuthPoint>;
  /** The card's top row (staff: the brand and the small language switch). */
  header?: ReactNode;
  /** Under the form, inside the card (fine print). */
  footer?: ReactNode;
  children: ReactNode;
}

/**
 * The shared sign-in design (DESIGN §F) for customers and staff: the still-life artwork and a
 * floating form card. From the `nav` breakpoint the two sit side by side and the card overlaps the
 * art panel's edge; below it the art becomes a 160–200 px band and the card spans the width,
 * rising a little over the band. Server component; the artwork is inline SVG (no request, CSP
 * unchanged). Used by `/admin/login` and the customer sign-in, and meant for the staff
 * set-password, change-password and MFA pages too:
 *
 * ```tsx
 * <AuthLayout audience="staff" header={<StaffBrand … />} eyebrow={t.eyebrow} headline={t.headline}>
 *   <h1 …>{t.title}</h1>
 *   <SetPasswordForm … />
 * </AuthLayout>
 * ```
 */
export function AuthLayout({
  audience,
  frame = "page",
  switchLinks = null,
  switchVisibility = "always",
  eyebrow,
  headline,
  points = [],
  header,
  footer,
  children,
}: AuthLayoutProps) {
  const page = frame === "page";
  return (
    <div
      data-auth-layout={audience}
      className={cn(
        "group/auth relative isolate text-ink",
        page
          ? "min-h-dvh bg-surface p-3 sm:p-4 nav:p-5"
          : "mx-auto w-full max-w-page px-3 py-4 sm:px-[clamp(16px,4vw,48px)] sm:py-[clamp(20px,3.5vw,48px)]",
      )}
    >
      <div
        className={cn(
          "mx-auto grid max-w-[1440px] grid-cols-1 nav:grid-cols-[minmax(0,1fr)_auto]",
          page ? "nav:min-h-[calc(100dvh-40px)]" : "nav:min-h-[700px]",
        )}
      >
        <ArtPanel eyebrow={eyebrow} headline={headline} points={points} />
        <div className="relative z-10 -mt-8 flex items-center px-1.5 sm:px-3 nav:mt-0 nav:-ml-24 nav:px-0 nav:py-10 nav:pr-[clamp(24px,4.5vw,88px)]">
          <section
            className={cn(
              "flex w-full flex-col gap-6 rounded-[24px] border border-line bg-surface-raised p-[clamp(20px,4.5vw,44px)]",
              "shadow-[0_1px_2px_rgb(42_36_24/0.06),0_24px_60px_-18px_rgb(42_36_24/0.32)]",
              "motion-safe:animate-rise-in nav:w-[min(468px,40vw)] nav:min-w-[400px]",
            )}
          >
            {header}
            {switchLinks ? (
              <AudienceSwitch
                current={audience}
                links={switchLinks}
                className={cn(
                  switchVisibility === "first-step" &&
                    "hidden group-has-[[data-auth-first-step]]/auth:block group-has-[[role=tablist]]/auth:block",
                )}
              />
            ) : null}
            {children}
            {footer}
          </section>
        </div>
      </div>
    </div>
  );
}

/**
 * The art panel: the `panel` crop with the text over a soft scrim (from `nav`), else the `band`
 * crop letterboxed on the scene's edge colour (`ARTWORK_EDGE`).
 */
function ArtPanel({
  eyebrow,
  headline,
  points,
}: {
  eyebrow?: ReactNode;
  headline?: ReactNode;
  points: ReadonlyArray<AuthPoint>;
}) {
  const hasText = Boolean(eyebrow || headline || points.length > 0);
  return (
    <div className="relative h-[clamp(160px,42vw,200px)] overflow-hidden rounded-[20px] bg-[#17120e] nav:h-auto nav:rounded-[28px]">
      <AuthArtwork crop="band" className="absolute inset-0 nav:hidden" />
      <AuthArtwork crop="panel" className="absolute inset-0 hidden nav:block" />
      {hasText ? (
        <div className="relative hidden h-full flex-col nav:flex">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-[58%] bg-linear-to-b from-[#120e0b]/90 via-[#120e0b]/55 to-transparent"
          />
          <div className="relative flex max-w-[min(520px,82%)] flex-col gap-5 p-[clamp(32px,3.6vw,56px)] pr-28">
            {eyebrow ? (
              <p className="m-0 flex items-center gap-3 text-overline text-banner-ink uppercase">
                <span aria-hidden="true" className="h-px w-8 bg-banner-ink/70" />
                {eyebrow}
              </p>
            ) : null}
            {headline ? (
              <p className="m-0 font-serif text-[clamp(34px,3.3vw,52px)] leading-[1.06] font-semibold tracking-[-0.015em] text-pretty text-banner-ink-soft">
                {headline}
              </p>
            ) : null}
            {points.length > 0 ? (
              <ul className="m-0 mt-1 flex list-none flex-col gap-3 p-0">
                {points.map((point, index) => (
                  <li
                    key={index}
                    className="flex items-center gap-3 text-label font-semibold text-banner-ink-soft/90"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-banner-ink/45 bg-[#120e0b]/40 text-banner-ink backdrop-blur-[2px]">
                      <Icon name={point.icon} size={17} />
                    </span>
                    {point.text}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
