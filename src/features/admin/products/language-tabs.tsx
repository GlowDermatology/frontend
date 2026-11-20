"use client";

import { useRef, type KeyboardEvent } from "react";

import type { ContentLanguage } from "@/domain/product";
import { cn } from "@/lib/cn";
import { useCopy } from "@/lib/i18n/admin-context";

import { productsCopy } from "./copy";

/**
 * The content languages by their own names (endonyms), the same in every admin language: a tab
 * says which language the fields below are written in.
 */
export const LANGUAGE_TAB_LABEL: Record<ContentLanguage, string> = {
  uz: "O‘zbekcha", // i18n-ignore
  ru: "Русский", // i18n-ignore
  en: "English",
};

interface LanguageTabsProps {
  languages: ReadonlyArray<ContentLanguage>;
  value: ContentLanguage;
  onChange: (language: ContentLanguage) => void;
  complete: Record<ContentLanguage, boolean>;
  /** Languages whose fields hold a validation error: a red dot and "(xato bor)". */
  invalid?: Partial<Record<ContentLanguage, boolean>>;
  /** Languages holding an unsaved AI text: a small gold dot, read out as `markedLabel`. */
  marked?: Partial<Record<ContentLanguage, boolean>>;
  markedLabel?: string;
  /** id prefix shared with the tab panel (`${idBase}-panel`). */
  idBase: string;
}

/**
 * Content-language tabs (ARIA tabs pattern with a single panel whose fields
 * switch language). The dot shows whether that language is fully filled in.
 */
export function LanguageTabs({
  languages,
  value,
  onChange,
  complete,
  invalid,
  marked,
  markedLabel,
  idBase,
}: LanguageTabsProps) {
  const t = useCopy(productsCopy).tabs;
  const refs = useRef<Partial<Record<ContentLanguage, HTMLButtonElement | null>>>({});

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = languages.length - 1;
    const next =
      event.key === "ArrowRight"
        ? index === last
          ? 0
          : index + 1
        : event.key === "ArrowLeft"
          ? index === 0
            ? last
            : index - 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : null;
    if (next === null) return;
    event.preventDefault();
    const language = languages[next]!;
    onChange(language);
    refs.current[language]?.focus();
  };

  return (
    <div role="tablist" aria-label={t.label} className="flex gap-1 rounded-md bg-gold-soft p-1">
      {languages.map((language, index) => {
        const selected = language === value;
        const hasErrors = Boolean(invalid?.[language]);
        return (
          <button
            key={language}
            ref={(node) => {
              refs.current[language] = node;
            }}
            type="button"
            role="tab"
            id={`${idBase}-tab-${language}`}
            aria-selected={selected}
            aria-controls={`${idBase}-panel`}
            tabIndex={selected ? 0 : -1}
            data-lang={language}
            data-has-errors={hasErrors || undefined}
            data-ai-marked={marked?.[language] || undefined}
            onClick={() => onChange(language)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              "flex h-9 items-center gap-2 rounded-[9px] px-3.5 text-[13px] leading-[18px] font-semibold text-ink transition-[background-color,box-shadow] duration-150",
              selected ? "bg-surface-raised shadow-sm" : "hover:bg-surface-raised/50",
              hasErrors && "ring-1 ring-danger/50",
            )}
          >
            {LANGUAGE_TAB_LABEL[language]}
            <span
              aria-hidden="true"
              className={cn(
                "size-2 rounded-full",
                hasErrors ? "bg-danger" : complete[language] ? "bg-success" : "bg-warning",
              )}
            />
            <span className="sr-only">
              {hasErrors ? t.hasErrors : complete[language] ? t.complete : t.incomplete}
            </span>
            {marked?.[language] && (
              <>
                <span aria-hidden="true" className="-ml-1 size-1.5 rounded-full bg-gold" />
                {markedLabel && <span className="sr-only">{markedLabel}</span>}
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
