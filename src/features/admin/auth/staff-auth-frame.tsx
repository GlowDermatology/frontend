import type { ReactNode } from "react";

import { STAFF_SIGN_IN_PATH } from "@/components/brand/audience-switch";
import { AuthLayout } from "@/components/brand/auth-layout";
import { Icon } from "@/components/ui/icon";
import { shopPath } from "@/features/shop/routing/routes";
import { HtmlLang } from "@/features/admin/shell/html-lang";
import { AdminLocaleProvider } from "@/lib/i18n/admin-context";
import { getAdminLocale } from "@/lib/i18n/admin-locale";

import { Skeleton } from "../shared/skeleton";
import { staffAuthCopy } from "./copy";
import { SignInLanguageSwitch } from "./language-switch";

/**
 * The staff auth frame (DESIGN §F): `AuthLayout` with the staff art texts, the card's brand row
 * with the small language switch, «Mijoz | Xodim» and the fine print, inside the admin locale
 * (`AdminLocaleProvider`, `<html lang>`), so client islands in `children` can `useCopy`. For
 * every staff page outside the panel shell — sign-in, and the coming set-password,
 * change-password and MFA step pages:
 *
 * ```tsx
 * <Suspense fallback={<StaffAuthFallback />}>
 *   <StaffAuthFrame switchAudience={false}>
 *     <StaffAuthHeading title={t.title} lead={t.lead} />
 *     <SetPasswordForm … />
 *   </StaffAuthFrame>
 * </Suspense>
 * ```
 *
 * Reads the language cookie: render it inside `<Suspense>`.
 */
export async function StaffAuthFrame({
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
      <AuthLayout
        audience="staff"
        frame="page"
        switchLinks={
          switchAudience && withCustomerLink
            ? {
                label: t.audience.label,
                customer: {
                  href: shopPath(locale, { kind: "signIn" }),
                  label: t.audience.customer,
                },
                staff: { href: STAFF_SIGN_IN_PATH, label: t.audience.staff },
              }
            : null
        }
        eyebrow={t.frame.eyebrow}
        headline={t.frame.headline}
        points={[
          { icon: "receipt", text: t.frame.points.orders },
          { icon: "calendar", text: t.frame.points.appointments },
          { icon: "users", text: t.frame.points.customers },
        ]}
        header={<StaffBrand />}
        footer={
          <p className="m-0 flex items-start gap-2 border-t border-line pt-5 text-body-sm text-ink-muted">
            <Icon name="lock" size={16} className="mt-px shrink-0 text-gold-ink" />
            {t.frame.footnote}
          </p>
        }
      >
        {children}
      </AuthLayout>
    </AdminLocaleProvider>
  );
}

/** «Glow Derma Admin» and the language switch: the top row of every staff auth card. */
function StaffBrand() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-baseline gap-2.5">
        <span className="font-serif text-title text-ink">Glow Derma</span>
        <span className="text-overline text-gold-ink uppercase">Admin</span>
      </div>
      <SignInLanguageSwitch />
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

/**
 * Language-neutral placeholder of a staff auth form (labels and inputs, the button): the inner
 * fallback while the session is checked, and inside `StaffAuthFallback` before the language is
 * known. Marked `data-auth-first-step` so a first-step-only switch keeps its place.
 */
export function StaffAuthSkeleton({ fields = 2 }: { fields?: number }) {
  return (
    <div aria-busy="true" data-auth-first-step className="flex flex-col gap-5">
      {Array.from({ length: fields }, (_, index) => (
        <div key={index} className="flex flex-col gap-2">
          <Skeleton className="h-4 w-16 rounded-sm" />
          <Skeleton className="h-11 rounded-md" />
        </div>
      ))}
      <Skeleton className="h-[52px] rounded-md" />
    </div>
  );
}

/** The outer fallback of a staff auth page: the frame's art and a skeleton card, no text yet. */
export function StaffAuthFallback({ fields = 2 }: { fields?: number }) {
  return (
    <AuthLayout audience="staff" frame="page">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-6 w-40 rounded-sm" />
        <Skeleton className="h-9 w-56 rounded-md" />
      </div>
      <StaffAuthSkeleton fields={fields} />
    </AuthLayout>
  );
}
