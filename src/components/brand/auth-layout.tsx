import type { ReactNode } from "react";

import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

import { AuthArtwork } from "./auth-artwork";
import { AudienceSwitch, type AudienceSwitchLinks, type AuthAudience } from "./audience-switch";
import { AuthViewTransitionGuard } from "./auth-view-transition";

export interface AuthPoint {
  icon: IconName;
  text: ReactNode;
}

export interface AuthLayoutProps {
  audience: AuthAudience;
  /** «Mijoz | Xodim»; omitted → no switch (e.g. the storefront is off, or a later step). */
  switchLinks?: AudienceSwitchLinks | null;
  /**
   * `always`, or `first-step`: shown only while the card holds a first step — an element with
   * `role="tablist"` (the customer panel's sign-in / sign-up tabs) or `data-auth-first-step`
   * (a skeleton standing in for it). Later steps (codes, new password) hide it without the
   * form having to know about the switch.
   */
  switchVisibility?: "always" | "first-step";
  /**
   * Over the art panel from the `nav` breakpoint: an `AuthCaption` (overline, serif line, up to
   * 3 points), or a `<Suspense>` around one with `AuthCaptionSkeleton` as its fallback when the
   * texts need request data (the staff language cookie). The panel's box never depends on it.
   */
  caption?: ReactNode;
  /** The card's top row (the brand, the language links). */
  header?: ReactNode;
  /** Under the form, inside the card (fine print). */
  footer?: ReactNode;
  children: ReactNode;
}

/**
 * Cross-fades the hard navigation between two sign-in pages (customer ↔ staff, each its own
 * document) where cross-document view transitions are supported, and only without a reduced-
 * motion preference. Both documents carry the rule, hoisted into `<head>` (so the new page has it
 * before its first paint; it stays in the document after a client navigation away). Leaving for
 * any other page skips the transition (`AuthViewTransitionGuard`).
 */
const VIEW_TRANSITION_CSS =
  "@media (prefers-reduced-motion: no-preference){@view-transition{navigation:auto}}";

/**
 * The shared sign-in design (DESIGN §F) for customers and staff: one full-viewport `<main>` with
 * the still-life artwork and a floating form card, the same frame for both roles so that moving
 * between them, or between the card's steps, never moves the art.
 *
 * Geometry is a function of the viewport only: from the `nav` breakpoint the art panel is sticky
 * and `100svh - 40px` tall (`svh`, so a phone's collapsing toolbar does not resize it), and the
 * card sits at a fixed, viewport-derived top offset, overlapping the panel's edge — a taller or
 * shorter form only extends the card downward. Below `nav` the art is a 160–200 px band and the
 * card spans the width, rising a little over it. The art panel carries `data-auth-art`, the card
 * `data-auth-card` (geometry tests). Server component; the artwork is inline SVG.
 *
 * ```tsx
 * <AuthLayout audience="staff" caption={<AuthCaption eyebrow={…} headline={…} />}>
 *   <h1 …>{t.title}</h1>
 *   <SetPasswordForm … />
 * </AuthLayout>
 * ```
 *
 * Pages whose texts need request data render the layout itself statically and suspend only the
 * caption and the card's content (see `features/admin/auth/staff-auth-frame.tsx`): the frame and
 * the artwork then never remount.
 */
export function AuthLayout({
  audience,
  switchLinks = null,
  switchVisibility = "always",
  caption,
  header,
  footer,
  children,
}: AuthLayoutProps) {
  return (
    <main
      data-auth-layout={audience}
      className="group/auth relative isolate min-h-svh bg-surface p-3 text-ink sm:p-4 nav:p-5"
    >
      <style href="gd-auth-view-transition" precedence="default">
        {VIEW_TRANSITION_CSS}
      </style>
      <AuthViewTransitionGuard />
      <div className="mx-auto grid max-w-[1440px] grid-cols-1 nav:grid-cols-[minmax(0,1fr)_auto] nav:items-start">
        <ArtPanel caption={caption} />
        <div className="relative z-10 -mt-8 flex px-1.5 sm:px-3 nav:mt-0 nav:-ml-24 nav:px-0 nav:pt-[max(40px,calc(50svh-380px))] nav:pr-[clamp(24px,4.5vw,88px)] nav:pb-10">
          <section
            data-auth-card=""
            className={cn(
              "flex w-full flex-col gap-6 rounded-[24px] border border-line bg-surface-raised p-[clamp(20px,4.5vw,44px)]",
              "shadow-[0_1px_2px_rgb(42_36_24/0.06),0_24px_60px_-18px_rgb(42_36_24/0.32)]",
              "nav:w-[min(468px,40vw)] nav:min-w-[400px]",
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
    </main>
  );
}

/**
 * The art panel: the `panel` crop with the caption over a soft scrim (from `nav`), else the
 * `band` crop letterboxed on the scene's edge colour (`ARTWORK_EDGE`). Sticky and sized by the
 * viewport alone from `nav`, so the card's height never stretches or shrinks it.
 */
function ArtPanel({ caption }: { caption?: ReactNode }) {
  return (
    <div
      data-auth-art=""
      className="relative h-[clamp(160px,42vw,200px)] overflow-hidden rounded-[20px] bg-[#17120e] nav:sticky nav:top-5 nav:h-[calc(100svh-40px)] nav:self-start nav:rounded-[28px]"
    >
      <AuthArtwork crop="band" className="absolute inset-0 nav:hidden" />
      <AuthArtwork crop="panel" className="absolute inset-0 hidden nav:block" />
      {caption ? (
        <div className="relative hidden h-full flex-col nav:flex">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-[58%] bg-linear-to-b from-[#120e0b]/90 via-[#120e0b]/55 to-transparent"
          />
          {caption}
        </div>
      ) : null}
    </div>
  );
}

const CAPTION_CLASS =
  "relative flex max-w-[min(520px,82%)] flex-col gap-5 p-[clamp(32px,3.6vw,56px)] pr-28";

/** The art panel's texts: an overline, a serif line (not a heading) and up to 3 points. */
export function AuthCaption({
  eyebrow,
  headline,
  points = [],
}: {
  eyebrow?: ReactNode;
  headline?: ReactNode;
  points?: ReadonlyArray<AuthPoint>;
}) {
  return (
    <div className={CAPTION_CLASS}>
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
  );
}

/**
 * Stand-in for `AuthCaption` while its texts load: the same box (overline, two serif lines,
 * `points` rows) in quiet bars over the artwork. Decorative.
 */
export function AuthCaptionSkeleton({ points = 3 }: { points?: number }) {
  const bar = "block rounded-full bg-banner-ink/15";
  return (
    <div aria-hidden="true" className={CAPTION_CLASS}>
      <span className="flex h-[14px] items-center gap-3">
        <span className="h-px w-8 bg-banner-ink/40" />
        <span className={cn(bar, "h-2.5 w-32")} />
      </span>
      <span className="flex flex-col gap-[0.4em] text-[clamp(34px,3.3vw,52px)] leading-[1.06]">
        <span className={cn(bar, "h-[0.8em] w-full")} />
        <span className={cn(bar, "h-[0.8em] w-3/4")} />
      </span>
      {points > 0 ? (
        <span className="mt-1 flex flex-col gap-3">
          {Array.from({ length: points }, (_, index) => (
            <span key={index} className="flex items-center gap-3">
              <span className="size-9 shrink-0 rounded-full border border-banner-ink/30" />
              <span className={cn(bar, "h-3 w-40")} />
            </span>
          ))}
        </span>
      ) : null}
    </div>
  );
}
