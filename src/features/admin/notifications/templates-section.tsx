"use client";

import { useRef, useState, type FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, IconButton } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Dialog, DialogClose } from "@/components/ui/dialog";
import { Field, TextArea } from "@/components/ui/field";
import { FormErrorSummary } from "@/components/ui/form-errors";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { updateNotificationTemplate } from "@/data/notifications.actions";
import { notificationDataCopy } from "@/domain/copy/notifications";
import { orderLabelsCopy } from "@/domain/copy/orders";
import {
  TEMPLATE_MAX,
  TEMPLATE_PLACEHOLDER,
  TEMPLATE_UZ_MIN,
  templateRecommendedToAsk,
  unknownPlaceholders,
  type StatusTemplate,
} from "@/domain/notification";
import { CONTENT_LANGUAGES, type ContentLanguage } from "@/domain/product";
import { useRecommendedConfirm } from "@/lib/forms/recommended";
import { useErrorReveal } from "@/lib/forms/reveal";
import { useAdminLocale, useCopy } from "@/lib/i18n/admin-context";
import { useFormat } from "@/lib/i18n/admin-hooks";
import type { Locale } from "@/lib/i18n/locales";
import { validationCopy } from "@/lib/i18n/validation-copy";

import { runAction } from "../shared/action-client";
import { partitionFieldErrors } from "../shared/field-errors";
import { useIdempotencyKey, type IdempotencyKey } from "../shared/idempotency";
import { ORDER_STATUS_META } from "../shared/status";
import { notificationsCopy } from "./copy";

/**
 * The template's rules as the backend checks them, in the admin language, keyed like the
 * server's field errors (`texts.uz`): Uzbek of at least five characters, every language at most
 * 180, and no placeholder other than `{raqam}`. `{}` when the texts can be sent.
 */
export function templateErrors(
  texts: Record<ContentLanguage, string>,
  locale: Locale,
): Record<string, string> {
  const v = validationCopy[locale];
  const m = notificationDataCopy[locale].schema;
  const errors: Record<string, string> = {};
  for (const language of CONTENT_LANGUAGES) {
    const text = texts[language].trim();
    const unknown = unknownPlaceholders(text);
    if (language === "uz" && text.length < TEMPLATE_UZ_MIN) {
      errors[`texts.${language}`] = v.minChars(TEMPLATE_UZ_MIN);
    } else if (text.length > TEMPLATE_MAX) {
      errors[`texts.${language}`] = v.maxChars(TEMPLATE_MAX);
    } else if (unknown.length > 0) {
      errors[`texts.${language}`] = m.placeholders(TEMPLATE_PLACEHOLDER, unknown.join(", "));
    }
  }
  return errors;
}

/**
 * Automatic order-status pushes (sent by the backend, not from this screen)
 * and their per-language texts, editable through `PUT
 * notification-templates/{status}/` (contract §2.8). The only placeholder is
 * `{raqam}`; the form checks it first and the backend answers
 * `unknown_placeholder` on the offending language. An empty Russian or English
 * text is allowed (the Uzbek one is sent instead), so the dialog asks before
 * saving one.
 */
export function TemplatesSection({ templates }: { templates: ReadonlyArray<StatusTemplate> }) {
  const t = useCopy(notificationsCopy).templates;
  const statusNames = orderLabelsCopy[useAdminLocale()].status;
  const fmt = useFormat();
  const toast = useToast();
  const [source, setSource] = useState(templates);
  const [items, setItems] = useState(templates);
  if (templates !== source) {
    setSource(templates);
    setItems(templates);
  }
  const [editing, setEditing] = useState<StatusTemplate | null>(null);
  const [instance, setInstance] = useState(0);
  const idempotency = useIdempotencyKey();

  return (
    <Card aria-labelledby="status-templates-title" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <CardTitle id="status-templates-title" className="text-heading">
          {t.title}
        </CardTitle>
        <span className="text-caption font-normal text-ink-muted">
          {t.placeholder(TEMPLATE_PLACEHOLDER)}
        </span>
      </div>
      <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))] gap-3 p-0">
        {items.map((template) => {
          const name = statusNames[template.status];
          return (
            <li
              key={template.status}
              className="flex min-w-0 flex-col gap-2 rounded-md border border-line p-3.5"
            >
              <div className="flex items-center justify-between gap-2">
                <Badge tone={ORDER_STATUS_META[template.status].tone}>{name}</Badge>
                {template.texts && (
                  <IconButton
                    aria-label={t.editOf(name)}
                    onClick={() => {
                      setInstance((current) => current + 1);
                      setEditing(template);
                    }}
                  >
                    <Icon name="pencil" size={18} />
                  </IconButton>
                )}
              </div>
              <p className="m-0 text-body-sm [overflow-wrap:anywhere] break-words text-ink">
                {template.text}
              </p>
              <p className="m-0 flex gap-1.5 text-[11px] leading-[14px] font-bold tracking-[0.06em] text-ink-muted">
                {CONTENT_LANGUAGES.map((language) => (
                  <span key={language}>
                    <span aria-hidden="true">
                      {language.toUpperCase()} {template.translations[language] ? "✓" : "—"}
                    </span>
                    <span className="sr-only">
                      {template.translations[language]
                        ? t.present(t.language[language])
                        : t.missing(t.language[language])}
                      ;
                    </span>
                  </span>
                ))}
              </p>
              {template.updatedAt && (
                <p className="m-0 text-caption font-normal text-ink-muted">
                  {t.updated(fmt.dateTimeShort(template.updatedAt), template.updatedBy ?? t.system)}
                </p>
              )}
            </li>
          );
        })}
      </ul>
      {editing && (
        <TemplateDialog
          key={instance}
          template={editing}
          idempotency={idempotency}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            setItems((current) => current.map((x) => (x.status === saved.status ? saved : x)));
            toast({ tone: "success", title: t.saved, description: statusNames[saved.status] });
          }}
        />
      )}
    </Card>
  );
}

function TemplateDialog({
  template,
  idempotency,
  onClose,
  onSaved,
}: {
  template: StatusTemplate;
  idempotency: IdempotencyKey;
  onClose: () => void;
  onSaved: (template: StatusTemplate) => void;
}) {
  const t = useCopy(notificationsCopy).templates;
  const locale = useAdminLocale();
  const statusName = orderLabelsCopy[locale].status[template.status];
  const fmt = useFormat();
  const toast = useToast();
  const [texts, setTexts] = useState<Record<ContentLanguage, string>>(
    () => template.texts ?? { uz: template.text, ru: "", en: "" },
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const reveal = useErrorReveal(formRef);
  const { confirm, dialog: recommendedDialog } = useRecommendedConfirm();

  const label = (language: ContentLanguage) =>
    language === "uz" ? t.language.uz : t.optional(t.language[language]);
  const summary = Object.entries(errors).map(([name, message]) => ({
    name,
    label: label(name.slice("texts.".length) as ContentLanguage),
    message,
  }));

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inFlight.current) return;
    setFormError(null);
    const found = templateErrors(texts, locale);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      reveal();
      return;
    }
    inFlight.current = true;
    try {
      // Asked only when it is news: a language just emptied, or the Uzbek text changed while
      // a translation stays empty.
      const saved = template.texts ?? { uz: template.text, ru: "", en: "" };
      const missing = templateRecommendedToAsk(texts, saved).map((language) => ({
        name: `texts.${language}`,
        label: t.recommended[language],
      }));
      if (
        (await confirm(missing, { remember: { kind: "template", id: template.status } })) === "fix"
      ) {
        reveal({ name: missing[0]!.name });
        return;
      }
      setBusy(true);
      const result = idempotency.settle(
        await runAction((csrf) =>
          updateNotificationTemplate(template.status, texts, idempotency.key, csrf),
        ),
      );
      setBusy(false);
      if (!result.ok) {
        const { fieldErrors, formError: message } = partitionFieldErrors(
          result,
          CONTENT_LANGUAGES.map((l) => `texts.${l}`),
        );
        setErrors(fieldErrors);
        setFormError(message);
        if (Object.keys(fieldErrors).length > 0) reveal();
        else toast({ tone: "danger", title: t.notSaved, description: message ?? undefined });
        return;
      }
      onSaved(result.data);
      onClose();
    } finally {
      inFlight.current = false;
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
      title={t.dialogTitle(statusName)}
      description={t.dialogText(TEMPLATE_PLACEHOLDER)}
      className="max-w-[560px]"
    >
      <form ref={formRef} noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        {summary.length > 1 && (
          <FormErrorSummary errors={summary} onSelect={(name) => reveal({ name })} />
        )}
        {CONTENT_LANGUAGES.map((language) => (
          <Field
            key={language}
            label={label(language)}
            name={`texts.${language}`}
            error={errors[`texts.${language}`]}
            aside={
              <span className="text-caption text-ink-muted tabular-nums">
                {fmt.number(texts[language].length)} / {fmt.number(TEMPLATE_MAX)}
              </span>
            }
          >
            {(props) => (
              <TextArea
                {...props}
                name={`texts.${language}`}
                rows={2}
                maxLength={TEMPLATE_MAX}
                value={texts[language]}
                onChange={(event) => {
                  const value = event.target.value;
                  setTexts((current) => ({ ...current, [language]: value }));
                }}
              />
            )}
          </Field>
        ))}
        {formError && (
          <p
            role="alert"
            className="m-0 flex items-start gap-1.5 text-body-sm font-semibold text-ink"
          >
            <Icon name="alert-circle" size={16} className="mt-px shrink-0 text-danger" />
            {formError}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <DialogClose asChild>
            <Button variant="outline" disabledReason={busy && t.savingReason}>
              {t.cancel}
            </Button>
          </DialogClose>
          <Button type="submit" busy={busy}>
            <Icon name="check" size={18} />
            {busy ? t.saving : t.save}
          </Button>
        </div>
        {recommendedDialog}
      </form>
    </Dialog>
  );
}
