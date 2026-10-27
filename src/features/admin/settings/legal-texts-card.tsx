"use client";

import { useId, useRef, useState, type FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogCancel } from "@/components/ui/dialog";
import { TextArea } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useToast } from "@/components/ui/toast";
import { publishTerms, updateLegalTexts } from "@/data/settings.actions";
import { legalTextsFormSchema, type LegalTextsFormValues } from "@/data/settings.schema";
import type { ContentLanguage } from "@/domain/product";
import {
  characterCount,
  hasVisibleText,
  LEGAL_DOCUMENT_LABEL,
  LEGAL_DOCUMENTS,
  LEGAL_TEXT_MAX,
  type LegalDocument,
  type SiteSettings,
} from "@/domain/settings";
import { cn } from "@/lib/cn";
import { formatDateTimeShort, formatNumber } from "@/lib/format";

import { LanguageTabs } from "../products/language-tabs";
import { runAction } from "../shared/action-client";
import { useIdempotencyKey } from "../shared/idempotency";
import { UnsavedChangesGuard } from "../shared/unsaved-guard";

const LANGUAGES: ReadonlyArray<ContentLanguage> = ["uz", "ru", "en"];

function toValues(settings: SiteSettings): LegalTextsFormValues {
  return {
    terms: { ...settings.terms },
    privacyPolicy: { ...settings.privacyPolicy },
    bookingPolicy: { ...settings.bookingPolicy },
  };
}

/** The first `document.language` key of `errors`, in the card's order. */
function firstErrorKey(errors: Record<string, string>): [LegalDocument, ContentLanguage] | null {
  for (const document of LEGAL_DOCUMENTS) {
    for (const language of LANGUAGES) {
      if (errors[`${document}.${language}`]) return [document, language];
    }
  }
  return null;
}

/** The publication's confirmation, word for word in the dialog and the e2e suite. */
export const PUBLISH_WARNING = "Barcha mijozlardan shartlarni qayta qabul qilish so‘raladi.";

/**
 * Huquqiy matnlar (gap X-SET-LEGAL, contract §2.11): the Terms of Use and
 * Privacy Policy DRAFTS and the booking policy, per language. «Saqlash»
 * stores the drafts (only the changed languages); «E’lon qilish» publishes
 * the saved terms and privacy drafts as a new `terms_version` after a
 * confirmation, since every customer is then asked to accept them again.
 * The booking policy is not versioned: the app shows it once it is saved.
 */
export function LegalTextsCard({ settings: initial }: { settings: SiteSettings }) {
  const toast = useToast();
  const idBase = useId();
  const [source, setSource] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [values, setValues] = useState(() => toValues(initial));
  const [document, setDocument] = useState<LegalDocument>("terms");
  const [language, setLanguage] = useState<ContentLanguage>("uz");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const saveKey = useIdempotencyKey();

  const [publishOpen, setPublishOpen] = useState(false);
  const [publishBusy, setPublishBusy] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const publishInFlight = useRef(false);
  const publishKey = useIdempotencyKey();

  const baseline = toValues(saved);
  const dirty = JSON.stringify(values) !== JSON.stringify(baseline);

  // A newer server copy (the refresh after a save here or in another card)
  // replaces the texts only while nothing is being edited here.
  if (initial !== source) {
    setSource(initial);
    setSaved(initial);
    if (!dirty) setValues(toValues(initial));
  }

  const text = values[document][language];
  const max = LEGAL_TEXT_MAX[document];
  const count = characterCount(text);
  const error = errors[`${document}.${language}`];
  const errorId = error ? `${idBase}-error` : undefined;
  const countId = `${idBase}-count`;
  const unpublished = saved.termsUnpublishedChanges;

  const focusError = (next: Record<string, string>) => {
    const first = firstErrorKey(next);
    if (!first) return;
    setDocument(first[0]);
    setLanguage(first[1]);
    requestAnimationFrame(() => textarea.current?.focus());
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inFlight.current || !dirty) return;
    const local = legalTextsFormSchema.safeParse(values);
    if (!local.success) {
      const next: Record<string, string> = {};
      for (const issue of local.error.issues) next[issue.path.join(".")] ??= issue.message;
      setErrors(next);
      setFormError(null);
      focusError(next);
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setErrors({});
    setFormError(null);
    const result = saveKey.settle(
      await runAction((csrf) => updateLegalTexts(local.data, baseline, saveKey.key, csrf)),
    );
    inFlight.current = false;
    setBusy(false);
    if (!result.ok) {
      const next = result.fieldErrors ?? {};
      setErrors(next);
      // A message without a place in the editor (a bare `terms`, a read-only field).
      setFormError(firstErrorKey(next) ? null : result.error);
      focusError(next);
      return;
    }
    setSaved(result.data);
    setValues(toValues(result.data));
    toast({
      title: "Matnlar saqlandi",
      description: result.data.termsUnpublishedChanges
        ? "Mijozlar yangi shartlarni e’lon qilganingizdan keyin ko‘radi."
        : undefined,
    });
  };

  const confirmPublish = async () => {
    if (publishInFlight.current) return;
    publishInFlight.current = true;
    setPublishBusy(true);
    setPublishError(null);
    const result = publishKey.settle(
      await runAction((csrf) =>
        publishTerms(
          { ...toValues(saved), termsVersion: saved.termsVersion },
          publishKey.key,
          csrf,
        ),
      ),
    );
    publishInFlight.current = false;
    setPublishBusy(false);
    if (!result.ok) {
      setPublishError(result.error);
      return;
    }
    setSaved(result.data);
    setValues(toValues(result.data));
    setPublishOpen(false);
    toast({
      title: `Shartlar e’lon qilindi: ${result.data.termsVersion ?? ""}`,
      description: "Mijozlar ilovada yangi versiyani qabul qiladi.",
    });
  };

  return (
    <Card aria-labelledby="legal-title" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <CardTitle id="legal-title" className="text-heading">
            Huquqiy matnlar
          </CardTitle>
          <p className="m-0 text-body-sm text-ink-muted" data-testid="terms-version">
            {saved.termsVersion ? (
              <>
                Joriy versiya: <span className="font-semibold text-ink">{saved.termsVersion}</span>
                {saved.termsUpdatedAt && (
                  <>
                    {" "}
                    · e’lon qilingan{" "}
                    <time dateTime={saved.termsUpdatedAt}>
                      {formatDateTimeShort(saved.termsUpdatedAt)}
                    </time>
                  </>
                )}
              </>
            ) : (
              "E’lon qilinmagan"
            )}
          </p>
        </div>
        {unpublished && <Badge tone="warning">E’lon qilinmagan o‘zgarishlar bor</Badge>}
      </div>

      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        <SegmentedControl<LegalDocument>
          label="Hujjat"
          layout="fill"
          size="sm"
          value={document}
          onChange={setDocument}
          options={LEGAL_DOCUMENTS.map((value) => ({
            value,
            label: (
              <span className="flex items-center gap-1.5">
                {LEGAL_DOCUMENT_LABEL[value]}
                {LANGUAGES.some((l) => errors[`${value}.${l}`]) && (
                  <Icon name="alert-circle" size={14} className="text-danger" />
                )}
              </span>
            ),
          }))}
          className="max-sm:grid-flow-row"
        />
        <LanguageTabs
          languages={LANGUAGES}
          value={language}
          onChange={setLanguage}
          complete={{
            uz: hasVisibleText(values[document].uz),
            ru: hasVisibleText(values[document].ru),
            en: hasVisibleText(values[document].en),
          }}
          idBase={idBase}
        />
        <div
          role="tabpanel"
          id={`${idBase}-panel`}
          aria-labelledby={`${idBase}-tab-${language}`}
          className="flex flex-col gap-2"
        >
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor={`${idBase}-text`} className="text-label text-ink">
              {LEGAL_DOCUMENT_LABEL[document]} ({language})
            </label>
            <span
              id={countId}
              className={cn(
                "text-caption font-normal tabular-nums",
                count > max ? "font-semibold text-danger" : "text-ink-muted",
              )}
            >
              {formatNumber(count)} / {formatNumber(max)}
            </span>
          </div>
          <TextArea
            ref={textarea}
            id={`${idBase}-text`}
            name={`${document}.${language}`}
            rows={14}
            value={text}
            aria-invalid={error ? true : undefined}
            aria-describedby={[errorId, countId].filter(Boolean).join(" ")}
            onChange={(event) => {
              const next = event.target.value;
              setValues((current) => ({
                ...current,
                [document]: { ...current[document], [language]: next },
              }));
            }}
            className="min-h-[240px] font-sans text-body-sm"
          />
          {error && (
            <p id={errorId} className="m-0 flex items-start gap-1.5 text-body-sm font-semibold">
              <Icon name="alert-circle" size={16} className="mt-px shrink-0 text-danger" />
              {error}
            </p>
          )}
          <p className="m-0 text-caption font-normal text-ink-muted">
            {document === "bookingPolicy"
              ? "Qabul qoidalari saqlangach ilovada darhol ko‘rinadi (versiyalanmaydi)."
              : "Saqlangan matn mijozlarga faqat «E’lon qilish»dan keyin ko‘rinadi. O‘zbekcha matn majburiy."}
          </p>
        </div>

        {formError && (
          <p
            role="alert"
            className="m-0 flex items-start gap-1.5 text-body-sm font-semibold text-ink"
          >
            <Icon name="alert-circle" size={16} className="mt-px shrink-0 text-danger" />
            {formError}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-caption font-normal text-ink-muted" role="status">
            {dirty ? "Saqlanmagan o‘zgarishlar bor" : ""}
          </span>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={dirty || busy}
              aria-describedby={dirty ? `${idBase}-publish-hint` : undefined}
              onClick={() => {
                setPublishError(null);
                setPublishOpen(true);
              }}
            >
              <Icon name="send" size={18} />
              E’lon qilish
            </Button>
            <Button type="submit" disabled={busy || !dirty} aria-busy={busy}>
              <Icon name="check" size={18} />
              {busy ? "Saqlanmoqda…" : "Saqlash"}
            </Button>
          </div>
        </div>
        {dirty && (
          <p id={`${idBase}-publish-hint`} className="m-0 text-caption font-normal text-ink-muted">
            E’lon qilishdan oldin o‘zgarishlarni saqlang.
          </p>
        )}
      </form>

      <UnsavedChangesGuard dirty={dirty} />

      <AlertDialog
        open={publishOpen}
        onOpenChange={(open) => {
          if (publishBusy) return;
          setPublishOpen(open);
        }}
        title="Shartlarning yangi versiyasini e’lon qilasizmi?"
        description={
          <span className="flex flex-col gap-2 text-[14px] leading-5 text-ink">
            <span className="font-semibold">{PUBLISH_WARNING}</span>
            <span>
              Saqlangan foydalanish shartlari va maxfiylik siyosati (barcha tillarda) yangi versiya
              sifatida e’lon qilinadi. Mijozlar yangi versiyani qabul qilmaguncha buyurtma bera
              olmaydi va qabulga yozila olmaydi. Bu amalni qaytarib bo‘lmaydi.
            </span>
          </span>
        }
      >
        {publishError && (
          <p
            role="alert"
            className="m-0 flex items-start gap-1.5 text-body-sm font-semibold text-ink"
          >
            <Icon name="alert-circle" size={16} className="mt-px shrink-0 text-danger" />
            {publishError}
          </p>
        )}
        <div className="mt-1.5 flex flex-wrap justify-end gap-2">
          <AlertDialogCancel
            disabled={publishBusy}
            className={buttonStyles({ variant: "outline" })}
          >
            Bekor qilish
          </AlertDialogCancel>
          <Button onClick={confirmPublish} disabled={publishBusy} aria-busy={publishBusy}>
            {publishBusy ? "E’lon qilinmoqda…" : "E’lon qilish"}
          </Button>
        </div>
      </AlertDialog>
    </Card>
  );
}
