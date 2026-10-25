"use client";

import { useRef, useState, type FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Dialog, DialogClose } from "@/components/ui/dialog";
import { Field, TextArea } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { updateNotificationTemplate } from "@/data/notifications.actions";
import { TEMPLATE_MAX, TEMPLATE_PLACEHOLDER, type StatusTemplate } from "@/domain/notification";
import { CONTENT_LANGUAGES, type ContentLanguage } from "@/domain/product";
import { formatDateTimeShort } from "@/lib/format";

import { runAction } from "../shared/action-client";
import { partitionFieldErrors } from "../shared/field-errors";
import { useIdempotencyKey, type IdempotencyKey } from "../shared/idempotency";
import { ORDER_STATUS_META } from "../shared/status";

const LANGUAGE_NAME = { uz: "o‘zbekcha", ru: "ruscha", en: "inglizcha" } as const;
const LANGUAGE_LABEL = { uz: "O‘zbekcha", ru: "Ruscha", en: "Inglizcha" } as const;

/**
 * Automatic order-status pushes (sent by the backend, not from this screen)
 * and their per-language texts, editable through `PUT
 * notification-templates/{status}/` (contract §2.8). The only placeholder is
 * `{raqam}`; the backend checks it and answers `unknown_placeholder` on the
 * offending language.
 */
export function TemplatesSection({ templates }: { templates: ReadonlyArray<StatusTemplate> }) {
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
          Buyurtma holati shablonlari
        </CardTitle>
        <span className="text-caption font-normal text-ink-muted">
          O‘rinbosar: {TEMPLATE_PLACEHOLDER} — buyurtma raqami
        </span>
      </div>
      <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))] gap-3 p-0">
        {items.map((template) => {
          const meta = ORDER_STATUS_META[template.status];
          return (
            <li
              key={template.status}
              className="flex flex-col gap-2 rounded-md border border-line p-3.5"
            >
              <div className="flex items-center justify-between gap-2">
                <Badge tone={meta.tone}>{meta.label}</Badge>
                {template.texts && (
                  <button
                    type="button"
                    aria-label={`«${meta.label}» shablonini tahrirlash`}
                    onClick={() => {
                      setInstance((current) => current + 1);
                      setEditing(template);
                    }}
                    className="flex size-9 items-center justify-center rounded-md text-ink-muted transition-colors duration-150 hover:bg-gold-soft hover:text-ink"
                  >
                    <Icon name="pencil" size={18} />
                  </button>
                )}
              </div>
              <p className="m-0 text-body-sm text-ink">{template.text}</p>
              <p className="m-0 flex gap-1.5 text-[11px] leading-[14px] font-bold tracking-[0.06em] text-ink-muted">
                {CONTENT_LANGUAGES.map((language) => (
                  <span key={language}>
                    <span aria-hidden="true">
                      {language.toUpperCase()} {template.translations[language] ? "✓" : "—"}
                    </span>
                    <span className="sr-only">
                      {LANGUAGE_NAME[language]} matn{" "}
                      {template.translations[language] ? "bor" : "yo‘q"};
                    </span>
                  </span>
                ))}
              </p>
              {template.updatedAt && (
                <p className="m-0 text-caption font-normal text-ink-muted">
                  O‘zgartirilgan: {formatDateTimeShort(template.updatedAt)} ·{" "}
                  {template.updatedBy ?? "Tizim"}
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
            setItems((current) => current.map((t) => (t.status === saved.status ? saved : t)));
            toast({
              title: "Shablon saqlandi",
              description: ORDER_STATUS_META[saved.status].label,
            });
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
  const [texts, setTexts] = useState<Record<ContentLanguage, string>>(
    () => template.texts ?? { uz: template.text, ru: "", en: "" },
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setFormError(null);
    setErrors({});
    const result = idempotency.settle(
      await runAction((csrf) =>
        updateNotificationTemplate(template.status, texts, idempotency.key, csrf),
      ),
    );
    inFlight.current = false;
    setBusy(false);
    if (!result.ok) {
      const { fieldErrors, formError: message } = partitionFieldErrors(
        result,
        CONTENT_LANGUAGES.map((l) => `texts.${l}`),
      );
      setErrors(fieldErrors);
      setFormError(message);
      return;
    }
    onSaved(result.data);
    onClose();
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
      title={`«${ORDER_STATUS_META[template.status].label}» shabloni`}
      description={`Buyurtma raqami o‘rniga ${TEMPLATE_PLACEHOLDER} yozing; boshqa o‘rinbosarlar ishlamaydi. Ruscha yoki inglizcha bo‘sh bo‘lsa, o‘zbekchasi yuboriladi.`}
      className="max-w-[560px]"
    >
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        {CONTENT_LANGUAGES.map((language) => (
          <Field
            key={language}
            label={
              language === "uz"
                ? `${LANGUAGE_LABEL[language]}`
                : `${LANGUAGE_LABEL[language]} (ixtiyoriy)`
            }
            error={errors[`texts.${language}`]}
            aside={
              <span className="text-caption text-ink-muted tabular-nums">
                {texts[language].length} / {TEMPLATE_MAX}
              </span>
            }
          >
            {(c) => (
              <TextArea
                {...c}
                name={`texts.${language}`}
                rows={2}
                maxLength={TEMPLATE_MAX}
                value={texts[language]}
                onChange={(event) =>
                  setTexts((current) => ({ ...current, [language]: event.target.value }))
                }
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
          <DialogClose disabled={busy} className={buttonStyles({ variant: "outline" })}>
            Bekor qilish
          </DialogClose>
          <Button type="submit" disabled={busy} aria-busy={busy}>
            <Icon name="check" size={18} />
            {busy ? "Saqlanmoqda…" : "Saqlash"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
