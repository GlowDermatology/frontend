"use client";

import { useId, useState, type FormEvent } from "react";

import { LocaleFlag } from "@/components/brand/locale-flag";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { saveAdminLanguage } from "@/data/admin-language.actions";
import { cn } from "@/lib/cn";
import { useAdminLocale, useCopy } from "@/lib/i18n/admin-context";
import { LOCALE_INFO, LOCALES, type Locale } from "@/lib/i18n/locales";

import { runAction } from "../shared/action-client";
import { languageCopy } from "./language-copy";

/**
 * Settings → «Interfeys tili» (DESIGN §G): the three admin languages as selection tiles (native
 * radios, so arrows move the choice and nothing is saved until «Saqlash»), each with its flag and
 * its own name (in its own language, `lang` set for screen readers) over its name in the current
 * interface language. Saving calls `saveAdminLanguage` (`PATCH auth/me/` + the cookie +
 * `refresh()`), so the whole panel re-renders in the new language; the confirmation toast is
 * already written in it.
 */
export function LanguageCard() {
  const current = useAdminLocale();
  const t = useCopy(languageCopy);
  const toast = useToast();
  const titleId = useId();
  const descriptionId = useId();
  const [choice, setChoice] = useState<Locale>(current);
  const [saving, setSaving] = useState(false);
  // A refresh in another tab (or after a save) changes `current`: follow it while nothing new is
  // picked here.
  const [seen, setSeen] = useState(current);
  if (seen !== current) {
    setSeen(current);
    setChoice(current);
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving || choice === current) return;
    setSaving(true);
    const target = choice;
    const result = await runAction((csrf) => saveAdminLanguage(target, csrf));
    setSaving(false);
    if (result.ok) {
      const next = languageCopy[result.data.language];
      toast({ tone: "success", title: next.saved, description: next.savedDescription });
      return;
    }
    toast({ tone: "danger", title: t.failed, description: result.error });
  };

  return (
    <Card aria-labelledby={titleId} className="flex flex-col gap-5 p-6">
      <div className="flex items-start gap-3.5">
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gold-soft text-gold-ink"
        >
          <Icon name="globe" size={20} />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <CardTitle id={titleId}>{t.title}</CardTitle>
          <p id={descriptionId} className="m-0 text-body-sm [text-wrap:pretty] text-ink-muted">
            {t.description}
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <fieldset
          aria-describedby={descriptionId}
          className="m-0 grid min-w-0 grid-cols-1 gap-2.5 border-0 p-0 sm:grid-cols-3 lg:grid-cols-1"
        >
          <legend className="sr-only">{t.title}</legend>
          {LOCALES.map((locale) => {
            const info = LOCALE_INFO[locale];
            const translated = t.names[locale];
            const checked = choice === locale;
            const showTranslated = translated.toLowerCase() !== info.name.toLowerCase();
            return (
              <label
                key={locale}
                className={cn(
                  "group relative flex min-h-[68px] cursor-pointer items-center gap-3 rounded-md border-[1.5px] bg-surface-raised px-3.5 py-3",
                  "transition-[border-color,background-color,box-shadow] duration-200 ease-out motion-reduce:transition-none",
                  "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-gold-ink",
                  checked
                    ? "border-gold bg-gold-soft/45 shadow-sm"
                    : "border-line-strong hover:border-gold/70 hover:bg-gold-soft/20",
                  saving && "cursor-wait",
                )}
              >
                <input
                  type="radio"
                  name="language"
                  value={locale}
                  checked={checked}
                  onChange={() => setChoice(locale)}
                  className="sr-only"
                />
                <LocaleFlag locale={locale} className="h-5 w-[30px]" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span lang={info.htmlLang} className="truncate text-label text-ink">
                    {info.name}
                  </span>
                  {showTranslated && (
                    <span className="truncate text-caption text-ink-muted">{translated}</span>
                  )}
                  {/* Under the names, so a narrow tile never squeezes the name out. */}
                  {locale === current && (
                    <span className="mt-1 self-start rounded-full border border-line-strong px-2 py-0.5 text-[11px] leading-[14px] font-semibold text-ink-muted">
                      {t.current}
                    </span>
                  )}
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors duration-200 motion-reduce:transition-none",
                    checked ? "border-gold bg-gold text-on-gold" : "border-line-strong bg-surface",
                  )}
                >
                  {checked && <Icon name="check" size={12} />}
                </span>
              </label>
            );
          })}
        </fieldset>

        <div className="flex justify-end">
          <Button
            type="submit"
            variant="secondary"
            busy={saving}
            disabledReason={!saving && choice === current ? t.unchanged : undefined}
          >
            {t.save}
          </Button>
        </div>
      </form>
    </Card>
  );
}
