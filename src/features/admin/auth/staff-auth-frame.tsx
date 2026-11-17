import { Suspense, type ReactNode } from "react";

import { STAFF_SIGN_IN_PATH, AudienceSwitch } from "@/components/brand/audience-switch";
import { AuthCaption, AuthCaptionSkeleton, AuthLayout } from "@/components/brand/auth-layout";
import { Icon } from "@/components/ui/icon";
import { shopPath } from "@/features/shop/routing/routes";
import { HtmlLang } from "@/features/admin/shell/html-lang";
import { AdminLocaleProvider } from "@/lib/i18n/admin-context";
import { getAdminLocale } from "@/lib/i18n/admin-locale";

import { Skeleton } from "../shared/skeleton";
import { staffAuthCopy } from "./copy";
import { SignInLanguageSwitch } from "./language-switch";

/**
 * The staff auth frame (DESIGN §F) for every staff page outside the panel shell — sign-in,
 * set-password, change-password and the MFA step. The frame itself (`AuthLayout`, the artwork,
 * the card) is static and rendered once; only the art caption and the card's content need the
 * language cookie, so only they sit inside `<Suspense>`, each with a placeholder of its own size.
 * Nothing remounts when they stream in, and the card's box stays where it was:
 *
 * ```tsx
 * <StaffAuthFrame>
 *   <Suspense fallback={<StaffAuthCardSkeleton fields={2} />}>
 *     <Screen />  // async: <StaffAuthCard><StaffAuthHeading … /><Form … /></StaffAuthCard>
 *   </Suspense>
 * </StaffAuthFrame>
 * ```
 */
export function StaffAuthFrame({ children }: { children: ReactNode }) {
  return (
    <AuthLayout
      audience="staff"
      caption={
        <Suspense fallback={<AuthCaptionSkeleton points={3} />}>
          <StaffCaption />
        </Suspense>
      }
    >
      {children}
    </AuthLayout>
  );
}

/** The art panel's texts in the admin language. Reads the language cookie. */
async function StaffCaption() {
  const t = staffAuthCopy[await getAdminLocale()];
  return (
    <AuthCaption
      eyebrow={t.frame.eyebrow}
      headline={t.frame.headline}
      points={[
        { icon: "receipt", text: t.frame.points.orders },
        { icon: "calendar", text: t.frame.points.appointments },
        { icon: "users", text: t.frame.points.customers },
      ]}
    />
  );
}

/**
 * The staff card's content: the brand row with the small language switch, «Mijoz | Xodim» (sign-in
 * only), `children`, and the fine print — inside the admin locale (`AdminLocaleProvider`,
 * `<html lang>`), so client islands in `children` can `useCopy`. Reads the language cookie: render
 * it inside the `<Suspense>` of a `StaffAuthFrame`, with `StaffAuthCardSkeleton` as the fallback.
 */
export async function StaffAuthCard({
  children,
  withCustomerLink = true,
  switchAudience = true,
}: {
  children: ReactNode;
  /** The customer side exists (the storefront is served); false hides «Mijoz | Xodim». */
  withCustomerLink?: boolean;
  /** Only the sign-in page offers the switch; later steps (password, MFA) do not. */
  switchAudience?: boolean;
}) {
  const locale = await getAdminLocale();
  const t = staffAuthCopy[locale];
  return (
    <AdminLocaleProvider locale={locale}>
      <HtmlLang locale={locale} />
      <StaffBrand>
        <SignInLanguageSwitch />
      </StaffBrand>
      {switchAudience && withCustomerLink ? (
        <AudienceSwitch
          current="staff"
          links={{
            label: t.audience.label,
            customer: { href: shopPath(locale, { kind: "signIn" }), label: t.audience.customer },
            staff: { href: STAFF_SIGN_IN_PATH, label: t.audience.staff },
          }}
        />
      ) : null}
      {children}
      <p className="m-0 flex items-start gap-2 border-t border-line pt-5 text-body-sm text-ink-muted">
        <Icon name="lock" size={16} className="mt-px shrink-0 text-gold-ink" />
        {t.frame.footnote}
      </p>
    </AdminLocaleProvider>
  );
}

/** «Glow Derma Admin» and the language switch: the top row of every staff auth card. */
function StaffBrand({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[38px] flex-wrap items-center justify-between gap-3">
      <div className="flex items-baseline gap-2.5">
        <span className="font-serif text-title text-ink">Glow Derma</span>
        <span className="text-overline text-gold-ink uppercase">Admin</span>
      </div>
      {children}
    </div>
  );
}

/** The card's `<h1>` and lead line. */
export function StaffAuthHeading({ title, lead }: { title: string; lead?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="m-0 font-serif text-headline-sm font-semibold text-ink">{title}</h1>
      {lead ? <p className="m-0 text-body text-pretty text-ink-muted">{lead}</p> : null}
    </div>
  );
}

/** Placeholder of `StaffAuthHeading`: the `<h1>` line and `leadLines` lines of lead. */
export function StaffAuthHeadingSkeleton({ leadLines = 1 }: { leadLines?: number }) {
  return (
    <div aria-hidden="true" className="flex flex-col gap-2">
      <span className="flex h-[1.1em] items-center text-headline-sm">
        <Skeleton className="h-[0.8em] w-3/5 rounded-md" />
      </span>
      {Array.from({ length: leadLines }, (_, index) => (
        <span key={index} className="flex h-[22px] items-center">
          <Skeleton className={index === leadLines - 1 ? "h-3.5 w-4/5" : "h-3.5 w-full"} />
        </span>
      ))}
    </div>
  );
}

/**
 * Language-neutral placeholder of a staff auth form (labels and inputs, the button): the inner
 * fallback while the session is checked, and inside `StaffAuthCardSkeleton` before the language
 * is known. Marked `data-auth-first-step` so a first-step-only switch keeps its place.
 */
export function StaffAuthSkeleton({ fields = 2 }: { fields?: number }) {
  return (
    <div aria-busy="true" data-auth-first-step className="flex flex-col gap-5">
      {Array.from({ length: fields }, (_, index) => (
        <div key={index} className="flex flex-col gap-2">
          <Skeleton className="h-[18px] w-24 rounded-sm" />
          <Skeleton className="h-11 rounded-md" />
        </div>
      ))}
      <Skeleton className="h-[52px] rounded-md" />
    </div>
  );
}

/**
 * The card's content before the language is known, laid out like `StaffAuthCard`: the brand row
 * (the brand is language-neutral, the switch a pill of its size), the «Mijoz | Xodim» bar when
 * the page offers it, a heading with `leadLines` of lead, the form skeleton and the fine print.
 */
export function StaffAuthCardSkeleton({
  fields = 2,
  audienceSwitch = false,
  leadLines = 1,
}: {
  fields?: number;
  audienceSwitch?: boolean;
  leadLines?: number;
}) {
  return (
    <>
      <StaffBrand>
        <Skeleton className="h-[38px] w-[186px] rounded-full" />
      </StaffBrand>
      {audienceSwitch ? <Skeleton className="h-[46px] rounded-full" /> : null}
      <StaffAuthHeadingSkeleton leadLines={leadLines} />
      <StaffAuthSkeleton fields={fields} />
      <div aria-hidden="true" className="flex flex-col gap-1.5 border-t border-line pt-5">
        <Skeleton className="h-3 w-full rounded-sm" />
        <Skeleton className="h-3 w-2/3 rounded-sm" />
      </div>
    </>
  );
}
