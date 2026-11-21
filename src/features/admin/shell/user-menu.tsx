"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DropdownMenu } from "radix-ui";
import { useEffect, useRef, useState } from "react";

import { themeCopy } from "@/components/brand/copy";
import { LocaleFlag } from "@/components/brand/locale-flag";
import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import { usePortalContainer } from "@/components/ui/layer";
import {
  MenuRadioGroup,
  MenuRadioItem,
  MenuSub,
  menuContentClass,
  menuItemClass,
  menuSeparatorClass,
} from "@/components/ui/menu";
import { ThemeSegments } from "@/components/ui/theme-control";
import { useOptionalToast } from "@/components/ui/toast";
import { saveAdminLanguage } from "@/data/admin-language.actions";
import { cn } from "@/lib/cn";
import { useAdminLocale, useCopy } from "@/lib/i18n/admin-context";
import { LOCALE_INFO, LOCALES, type Locale } from "@/lib/i18n/locales";

import { languageCopy } from "../settings/language-copy";
import { runAction } from "../shared/action-client";
import { readCsrfCookie } from "../shared/csrf";
import { shellCopy } from "./copy";

interface UserMenuProps {
  name: string;
  /** The account's email, or the «no session» text. */
  email: string;
  initials: string;
  /** The `gd_csrf` value at render time; the cookie is read again when signing out. */
  csrf: string;
  notificationActivity?: string | null;
  staffId?: string;
}

/** The header avatar opens staff identity and personal controls. */
export function UserMenu({
  name,
  email,
  initials,
  csrf,
  notificationActivity,
  staffId,
}: UserMenuProps) {
  const copy = useCopy(shellCopy);
  const t = copy.user;
  const languageText = useCopy(languageCopy);
  const locale = useAdminLocale();
  const toast = useOptionalToast();
  const container = usePortalContainer();
  const formRef = useRef<HTMLFormElement>(null);
  const csrfRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const pathname = usePathname();
  const viewingNotifications = pathname === "/admin/notifications";
  const storageKey = staffId ? `gd-admin-notification-activity:${staffId}` : null;
  const [seenActivity, setSeenActivity] = useState<string>();
  useEffect(() => {
    if (!storageKey || !notificationActivity) return;
    const sync = () => {
      try {
        setSeenActivity(localStorage.getItem(storageKey) ?? "");
      } catch {
        // Storage can be blocked. The menu still works without the badge.
      }
    };
    try {
      if (viewingNotifications) localStorage.setItem(storageKey, notificationActivity);
    } catch {
      // Storage is optional.
    }
    sync();
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [storageKey, notificationActivity, viewingNotifications]);
  const unread = Boolean(
    storageKey &&
    notificationActivity &&
    seenActivity !== undefined &&
    seenActivity !== notificationActivity &&
    !viewingNotifications,
  );

  const chooseLanguage = async (next: Locale) => {
    if (saving || next === locale) return;
    setSaving(true);
    const result = await runAction((token) => saveAdminLanguage(next, token));
    setSaving(false);
    if (result.ok) {
      const saved = languageCopy[result.data.language];
      toast?.({ tone: "success", title: saved.saved, description: saved.savedDescription });
    } else {
      toast?.({ tone: "danger", title: languageText.failed, description: result.error });
    }
  };

  const signOut = () => {
    if (csrfRef.current) csrfRef.current.value = readCsrfCookie() || csrf;
    formRef.current?.requestSubmit();
  };

  return (
    <>
      <DropdownMenu.Root modal={false}>
        <DropdownMenu.Trigger
          aria-label={`${t.menuLabel}: ${name}${unread ? ` · ${t.unreadNotifications}` : ""}`}
          data-user-menu=""
          {...(saving ? { "aria-busy": true } : {})}
          className="relative flex size-11 shrink-0 items-center justify-center rounded-full border border-line bg-surface-raised transition-colors duration-150 hover:bg-gold-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-ink data-[state=open]:bg-gold-soft"
        >
          <Avatar name={name} initials={initials} />
          {unread ? (
            <span
              aria-hidden="true"
              className="absolute top-0 right-0 size-3 rounded-full border-2 border-surface-raised bg-danger-strong"
            />
          ) : null}
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal container={container}>
          <DropdownMenu.Content
            side="bottom"
            align="end"
            sideOffset={8}
            collisionPadding={8}
            aria-label={t.menuLabel}
            className={cn(
              menuContentClass,
              "min-w-[max(var(--radix-dropdown-menu-trigger-width),256px)]",
            )}
          >
            <DropdownMenu.Label className="flex flex-col gap-0.5 px-3 py-2">
              <span className="truncate text-label">{name}</span>
              {email !== name ? (
                <span className="truncate text-caption text-ink-muted">{email}</span>
              ) : null}
            </DropdownMenu.Label>
            <DropdownMenu.Separator className={menuSeparatorClass} />
            <UserMenuItems
              unread={unread}
              onLanguage={(next) => void chooseLanguage(next)}
              onSignOut={signOut}
            />
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      <form ref={formRef} method="post" action="/admin/auth/logout" hidden>
        <input ref={csrfRef} type="hidden" name="csrf" defaultValue={csrf} />
        <input type="hidden" name="scope" value="current" />
      </form>
    </>
  );
}

/**
 * The profile menu's rows (inside its `DropdownMenu.Content`), in the admin language: «Sozlamalar»,
 * «Til · [flag] O‘zbekcha ›» (radio rows, a check on the current language), «Mavzu», «Chiqish».
 */
export function UserMenuItems({
  unread = false,
  onLanguage,
  onSignOut,
}: {
  unread?: boolean;
  onLanguage: (locale: Locale) => void;
  onSignOut: () => void;
}) {
  const copy = useCopy(shellCopy);
  const t = copy.user;
  const theme = useCopy(themeCopy);
  const languageText = useCopy(languageCopy);
  const locale = useAdminLocale();
  return (
    <>
      <DropdownMenu.Item asChild className={menuItemClass}>
        <Link href="/admin/notifications" prefetch={false}>
          <Icon name="bell" size={18} className="text-ink-muted" />
          {copy.notifications}
          {unread ? (
            <span className="ml-auto size-2 rounded-full bg-danger-strong">
              <span className="sr-only">{t.unreadNotifications}</span>
            </span>
          ) : null}
        </Link>
      </DropdownMenu.Item>
      <DropdownMenu.Item asChild className={menuItemClass}>
        <Link href="/admin/settings">
          <Icon name="sliders" size={18} className="text-ink-muted" />
          {t.settings}
        </Link>
      </DropdownMenu.Item>
      <DropdownMenu.Separator className={menuSeparatorClass} />
      <MenuSub
        label={t.language}
        icon={<Icon name="globe" size={18} />}
        value={
          <span className="flex items-center gap-2">
            <LocaleFlag locale={locale} className="h-3 w-[18px]" />
            <span className="truncate">{LOCALE_INFO[locale].name}</span>
          </span>
        }
        contentLabel={languageText.title}
      >
        <MenuRadioGroup<Locale>
          label={languageText.title}
          value={locale}
          onValueChange={onLanguage}
        >
          {LOCALES.map((option) => (
            <MenuRadioItem key={option} value={option} icon={<LocaleFlag locale={option} />}>
              <span lang={LOCALE_INFO[option].htmlLang}>{LOCALE_INFO[option].name}</span>
            </MenuRadioItem>
          ))}
        </MenuRadioGroup>
      </MenuSub>
      <ThemeSegments labels={theme} />
      <DropdownMenu.Separator className={menuSeparatorClass} />
      <DropdownMenu.Item className={menuItemClass} onSelect={onSignOut}>
        <Icon name="logout" size={18} className="text-ink-muted" />
        {t.logout}
      </DropdownMenu.Item>
    </>
  );
}
