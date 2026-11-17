"use client";

import Link from "next/link";
import { DropdownMenu } from "radix-ui";
import { useRef, useState } from "react";

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
}

/**
 * The admin profile menu (the sidebar's user block): the trigger is the avatar, name and email
 * row (as tall as the block it replaces) and the menu opens upward from it: «Sozlamalar», «Til ›»
 * (the three admin languages; choosing one saves it like Settings → «Interfeys tili», the panel
 * re-renders in it), «Mavzu» (light · dark · like the device, the menu stays open) and «Chiqish»
 * (submits the hidden POST form to the logout route; without JavaScript the sidebar shows the
 * plain `LogoutButton` instead). In the phone drawer the menu portals into the drawer's layer
 * host (`MobileNav`), so it stays inside the dialog.
 */
export function UserMenu({ name, email, initials, csrf }: UserMenuProps) {
  const t = useCopy(shellCopy).user;
  const languageText = useCopy(languageCopy);
  const locale = useAdminLocale();
  const toast = useOptionalToast();
  const container = usePortalContainer();
  const formRef = useRef<HTMLFormElement>(null);
  const csrfRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);

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
          aria-label={`${t.menuLabel}: ${name}`}
          data-user-menu=""
          {...(saving ? { "aria-busy": true } : {})}
          className="group flex min-h-11 w-full min-w-0 items-center gap-2.5 rounded-md px-1 text-left transition-colors duration-150 hover:bg-gold-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-ink data-[state=open]:bg-gold-soft"
        >
          <Avatar name={name} initials={initials} />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-body-sm font-bold text-ink">{name}</span>
            <span className="truncate text-caption font-normal text-ink-muted">{email}</span>
          </span>
          <Icon
            name="chevron-up"
            size={18}
            className="mr-1.5 shrink-0 text-ink-muted transition-transform duration-150 group-data-[state=open]:rotate-180"
          />
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal container={container}>
          <DropdownMenu.Content
            side="top"
            align="start"
            sideOffset={8}
            collisionPadding={8}
            aria-label={t.menuLabel}
            className={cn(
              menuContentClass,
              "min-w-[max(var(--radix-dropdown-menu-trigger-width),256px)]",
            )}
          >
            <UserMenuItems onLanguage={(next) => void chooseLanguage(next)} onSignOut={signOut} />
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
  onLanguage,
  onSignOut,
}: {
  onLanguage: (locale: Locale) => void;
  onSignOut: () => void;
}) {
  const t = useCopy(shellCopy).user;
  const theme = useCopy(themeCopy);
  const languageText = useCopy(languageCopy);
  const locale = useAdminLocale();
  return (
    <>
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
