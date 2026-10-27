"use client";

import { useId, type ReactNode } from "react";

import { Badge, type Tone } from "@/components/ui/badge";
import { Field, TextArea, TextInput } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { CONTENT_LANGUAGES, type ContentLanguage } from "@/domain/product";
import {
  groupSeoIssues,
  isSeoComplete,
  SEO_DESCRIPTION_MAX,
  SEO_LANGUAGE_CHIP,
  SEO_SEVERITY_LABEL,
  SEO_TITLE_MAX,
  slugProblem,
  type LengthState,
  type SeoSeverity,
  type SeoStatus,
  type SeoText,
  type SeoTexts,
} from "@/domain/seo";
import { cn } from "@/lib/cn";

import { LanguageTabs } from "../products/language-tabs";
import {
  buildSnippet,
  idealHint,
  publicPath,
  publicUrlLabel,
  seoCounter,
  siteHost,
  type PublicEntity,
} from "./seo-preview";

/**
 * The website SEO fields shared by the product, category and specialist
 * editors (B-W1): the URL slug with a live preview of the public address,
 * the per-language page title and meta description with counters and a
 * search-result preview, and the server's «SEO holati» checklist.
 */

/* --- Manzil (slug) --- */

interface SlugFieldProps {
  kind: PublicEntity;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  name?: string;
  inputRef?: (node: HTMLInputElement | null) => void;
  error?: string;
  max: number;
  /** The slug the server would derive from the name (shown while the field is empty on create). */
  suggestion: string;
  /** The stored slug (`null` before the first save): a change is warned about. */
  saved: string | null;
}

export function SlugField({
  kind,
  value,
  onChange,
  onBlur,
  name,
  inputRef,
  error,
  max,
  suggestion,
  saved,
}: SlugFieldProps) {
  const trimmed = value.trim();
  const shown = trimmed || (saved ?? "") || suggestion;
  // The live check while typing; the form's own error (submit, server) wins.
  const live = trimmed ? slugProblem(trimmed, max) : null;
  const changed = saved !== null && trimmed !== "" && trimmed !== saved;
  const previewId = useId();
  return (
    <Field
      label="Manzil (slug)"
      error={error ?? live ?? undefined}
      hint={
        saved === null
          ? "Bo‘sh qoldirilsa, saqlanganda nomdan yasaladi. Lotin kichik harflari, raqamlar va chiziqcha."
          : "Lotin kichik harflari, raqamlar va chiziqcha; faqat raqamdan iborat bo‘lmasin."
      }
    >
      {(c) => (
        <div className="flex flex-col gap-2">
          <span className="flex gap-2">
            <TextInput
              {...c}
              aria-describedby={[c["aria-describedby"], previewId].filter(Boolean).join(" ")}
              ref={inputRef}
              name={name}
              value={value}
              onChange={(event) => onChange(event.target.value.toLowerCase())}
              onBlur={onBlur}
              autoComplete="off"
              spellCheck={false}
              maxLength={max + 20}
              placeholder={suggestion || "masalan, gialuron-serum"}
              className="font-mono text-[14px]"
            />
            {suggestion && suggestion !== trimmed && (
              <button
                type="button"
                onClick={() => onChange(suggestion)}
                className="h-11 shrink-0 rounded-md px-3 text-[13px] leading-[18px] font-bold text-ink underline decoration-line-strong underline-offset-4 hover:decoration-gold"
              >
                Nomdan yasash
              </button>
            )}
          </span>
          <p
            id={previewId}
            className="m-0 flex min-w-0 items-start gap-1.5 text-body-sm text-ink-muted"
          >
            <Icon name="link" size={16} className="mt-px shrink-0 text-gold-ink" />
            <span className="min-w-0 break-all">
              Saytdagi manzil:{" "}
              {shown ? (
                <span className="font-mono text-ink" data-testid="slug-preview">
                  {publicUrlLabel(kind, shown)}
                </span>
              ) : (
                <span>saqlangandan keyin ko‘rinadi</span>
              )}
            </span>
          </p>
          {changed && (
            <p className="m-0 flex items-start gap-1.5 rounded-md bg-warning-soft px-3 py-2 text-body-sm text-ink">
              <Icon name="alert-triangle" size={16} className="mt-px shrink-0 text-warning" />
              Manzil o‘zgarsa, eski havola ({publicPath(kind, saved)}) ishlamay qoladi: saytda qayta
              yo‘naltirish saqlanmaydi.
            </p>
          )}
        </div>
      )}
    </Field>
  );
}

/* --- SEO sarlavha va tavsif --- */

const COUNTER_TONE: Record<LengthState, string> = {
  empty: "text-ink-muted",
  short: "text-warning",
  ideal: "text-success",
  long: "text-danger",
};

function Counter({
  value,
  kind,
  max,
}: {
  value: string;
  kind: "title" | "description";
  max: number;
}) {
  const info = seoCounter(value, kind, max);
  return (
    <span className="flex items-center gap-1.5 text-caption font-semibold tabular-nums">
      <span className={COUNTER_TONE[info.state]}>{info.note}</span>
      <span className="text-ink-muted">
        {info.count} / {info.max}
      </span>
    </span>
  );
}

export interface SeoFieldErrors {
  title?: string;
  description?: string;
}

interface SeoEditorProps {
  kind: PublicEntity;
  /** id prefix of the language tabs; the inputs are named `seo.{lang}.{title|description}`. */
  idBase: string;
  value: SeoTexts;
  onChange: (next: SeoTexts) => void;
  language: ContentLanguage;
  onLanguageChange: (language: ContentLanguage) => void;
  errors?: Partial<Record<ContentLanguage, SeoFieldErrors>>;
  /** The URL segment the preview shows (the typed, stored or suggested slug). */
  slug: string;
  /** What the website shows per language when a field is left empty. */
  fallback: Record<ContentLanguage, { title: string; description: string }>;
}

export function SeoEditor({
  kind,
  idBase,
  value,
  onChange,
  language,
  onLanguageChange,
  errors,
  slug,
  fallback,
}: SeoEditorProps) {
  const tabsId = `${idBase}-seo`;
  const current = value[language];
  const set = (leaf: keyof SeoText, text: string) =>
    onChange({ ...value, [language]: { ...current, [leaf]: text } });
  const complete = Object.fromEntries(
    CONTENT_LANGUAGES.map((l) => [l, isSeoComplete(value[l])]),
  ) as Record<ContentLanguage, boolean>;
  const snippet = buildSnippet({
    seo: current,
    fallbackTitle: fallback[language].title,
    fallbackDescription: fallback[language].description,
  });
  const fieldError = errors?.[language];

  return (
    <div className="flex flex-col gap-4">
      <LanguageTabs
        languages={CONTENT_LANGUAGES}
        value={language}
        onChange={onLanguageChange}
        complete={complete}
        idBase={tabsId}
      />
      <div
        key={language}
        role="tabpanel"
        id={`${tabsId}-panel`}
        aria-labelledby={`${tabsId}-tab-${language}`}
        lang={language}
        className="flex flex-col gap-4"
      >
        <Field
          label="SEO sarlavha"
          error={fieldError?.title}
          hint={`${idealHint("title")} Bo‘sh bo‘lsa, sayt nomdan foydalanadi.`}
          aside={<Counter value={current.title} kind="title" max={SEO_TITLE_MAX} />}
        >
          {(c) => (
            <TextInput
              {...c}
              name={`seo.${language}.title`}
              value={current.title}
              maxLength={SEO_TITLE_MAX}
              autoComplete="off"
              placeholder={fallback[language].title}
              onChange={(event) => set("title", event.target.value)}
            />
          )}
        </Field>
        <Field
          label="SEO tavsif"
          error={fieldError?.description}
          hint={`${idealHint("description")} Bo‘sh bo‘lsa, sayt tavsifdan yasaydi.`}
          aside={
            <Counter value={current.description} kind="description" max={SEO_DESCRIPTION_MAX} />
          }
        >
          {(c) => (
            <TextArea
              {...c}
              name={`seo.${language}.description`}
              value={current.description}
              maxLength={SEO_DESCRIPTION_MAX}
              rows={3}
              onChange={(event) => set("description", event.target.value)}
            />
          )}
        </Field>
        <figure className="m-0 flex flex-col gap-2">
          <figcaption className="text-body-sm font-semibold text-ink-muted">
            Qidiruvdagi ko‘rinishi
          </figcaption>
          <div
            data-testid="seo-snippet"
            className="flex flex-col gap-1 rounded-md border border-line bg-surface px-4 py-3.5"
          >
            <span className="flex items-center gap-2 text-caption text-ink-muted">
              <span
                aria-hidden="true"
                className="flex size-6 items-center justify-center rounded-full bg-gold-soft text-[11px] font-bold text-gold-ink"
              >
                G
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="font-semibold text-ink">Glow Derma</span>
                <span className="truncate">
                  {slug ? publicUrlLabel(kind, slug, language) : siteHost()}
                </span>
              </span>
            </span>
            <span className="text-[18px] leading-6 font-semibold text-gold-ink">
              {snippet.title}
            </span>
            <span
              className={cn(
                "text-body-sm leading-5",
                snippet.descriptionSource === "none" ? "text-ink-muted italic" : "text-ink",
              )}
            >
              {snippet.description || "Tavsif yo‘q: sayt sahifa ma’lumotlaridan yasaydi."}
            </span>
          </div>
          {(snippet.titleSource === "fallback" || snippet.descriptionSource !== "seo") && (
            <p className="m-0 text-caption font-normal text-ink-muted">
              Bo‘sh maydonlar o‘rniga sayt avtomatik matn ko‘rsatadi.
            </p>
          )}
        </figure>
      </div>
    </div>
  );
}

/* --- SEO holati --- */

const SEVERITY_TONE: Record<SeoSeverity, Tone> = {
  error: "danger",
  warning: "warning",
  info: "neutral",
};
const SEVERITY_ICON: Record<SeoSeverity, "alert-circle" | "alert-triangle" | "info"> = {
  error: "alert-circle",
  warning: "alert-triangle",
  info: "info",
};
const SEVERITY_ICON_CLASS: Record<SeoSeverity, string> = {
  error: "text-danger",
  warning: "text-warning",
  info: "text-ink-muted",
};

interface SeoStatusPanelProps {
  status: SeoStatus | null;
  /** Shown above the list (e.g. "Saqlangandan keyin yangilanadi"). */
  note?: ReactNode;
  /** Heading level id for `aria-labelledby` of the surrounding section. */
  titleId?: string;
  className?: string;
}

/**
 * «SEO holati»: the server's checklist grouped by severity, each issue with
 * its language chip; a green «Hammasi joyida» when nothing but hints is left.
 */
export function SeoStatusPanel({ status, note, titleId, className }: SeoStatusPanelProps) {
  const groups = status ? groupSeoIssues(status.issues) : [];
  return (
    <div className={cn("flex flex-col gap-3", className)} data-testid="seo-status">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id={titleId} className="m-0 text-[15px] leading-5 font-bold text-ink">
          SEO holati
        </h3>
        {status &&
          (status.ok ? (
            <Badge tone="success">Hammasi joyida</Badge>
          ) : (
            <Badge tone={groups[0]?.severity === "error" ? "danger" : "warning"}>
              {groups
                .filter((group) => group.severity !== "info")
                .map(
                  (group) =>
                    `${group.issues.length} ${group.severity === "error" ? "xato" : "ogohlantirish"}`,
                )
                .join(" · ")}
            </Badge>
          ))}
      </div>
      {note && <p className="m-0 text-caption font-normal text-ink-muted">{note}</p>}
      {!status ? (
        <p className="m-0 text-body-sm text-ink-muted">Saqlangandan keyin tekshiriladi.</p>
      ) : (
        <>
          {status.ok && (
            <p
              role="status"
              className="m-0 flex items-start gap-2 rounded-md bg-success-soft px-3.5 py-3 text-body-sm font-semibold text-ink"
            >
              <Icon name="shield-check" size={18} className="shrink-0 text-success" />
              Hammasi joyida: sahifa qidiruv uchun tayyor.
            </p>
          )}
          {groups.map((group) => (
            <section
              key={group.severity}
              aria-label={SEO_SEVERITY_LABEL[group.severity]}
              className="flex flex-col gap-1.5"
            >
              <h4 className="m-0 flex items-center gap-2 text-body-sm font-semibold text-ink-muted">
                <Badge tone={SEVERITY_TONE[group.severity]}>
                  {SEO_SEVERITY_LABEL[group.severity]}
                </Badge>
                <span className="tabular-nums">{group.issues.length}</span>
              </h4>
              <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                {group.issues.map((issue, index) => (
                  <li
                    key={`${issue.code}-${issue.language ?? "all"}-${index}`}
                    data-code={issue.code}
                    className="flex items-start gap-2 text-body-sm text-ink"
                  >
                    <Icon
                      name={SEVERITY_ICON[group.severity]}
                      size={16}
                      className={cn("mt-px shrink-0", SEVERITY_ICON_CLASS[group.severity])}
                    />
                    <span className="min-w-0 flex-1">{issue.message}</span>
                    {issue.language && (
                      <span
                        className="h-5 shrink-0 rounded-sm bg-gold-soft px-1.5 text-[11px] leading-5 font-bold text-ink"
                        aria-label={`Til: ${SEO_LANGUAGE_CHIP[issue.language]}`}
                      >
                        {SEO_LANGUAGE_CHIP[issue.language]}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
