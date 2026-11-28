"use client";

import Image from "next/image";
import { useId, useRef, useState } from "react";

import { Button, buttonStyles } from "@/components/ui/button";
import { AlertDialog, AlertDialogCancel, Dialog } from "@/components/ui/dialog";
import { Field, TextInput } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { PickedImage } from "@/components/ui/picked-image";
import { useToast } from "@/components/ui/toast";
import { imageFileProblem, IMAGE_TYPES } from "@/data/products.schema";
import { saveSceneTemplateEdits } from "@/data/scene-templates.actions";
import { CUSTOM_PROMPT_MAX, TEMPLATE_NAME_MAX, type SceneTemplate } from "@/domain/scene";
import { cn } from "@/lib/cn";
import { useAdminLocale, useCopy } from "@/lib/i18n/admin-context";

import { runAction } from "../shared/action-client";
import { useIdempotencyKey } from "../shared/idempotency";
import { sceneTemplatesCopy } from "./copy";
import { useTemplateReference } from "./use-template-reference";

/**
 * The scene template editor (admin contract §2.20.9), opened from a card's pen or «Yangi shablon»:
 * the names (uz, ru, en) and, for an AI template, a reference picture of the scene alone (upload,
 * replace, remove, or «Tavsifdan yaratish») and the scene in staff's words. Saving runs the AI's
 * translation and screening in the request (a few seconds: the button says so). «Ro‘yxatdan olib
 * tashlash» hides the template (the ops console turns it back on). A studio template edits its
 * names only (its colours are the console's).
 */

interface TemplateEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The template as listed now (re-read after a refresh); `null` creates an AI template. */
  template: SceneTemplate | null;
  /** After a save: the template as saved (the caller may pick it). */
  onSaved?: (template: SceneTemplate) => void;
}

type Errors = Partial<
  Record<"name.uz" | "name.ru" | "name.en" | "text" | "reference" | "form", string>
>;

export function TemplateEditor(props: TemplateEditorProps) {
  // Mounted fresh per opening (the form starts from the template as it is now).
  return props.open ? <EditorDialog {...props} /> : null;
}

function EditorDialog({ open, onOpenChange, template, onSaved }: TemplateEditorProps) {
  const copy = useCopy(sceneTemplatesCopy);
  const t = copy.editor;
  const locale = useAdminLocale();
  const toast = useToast();
  const idBase = useId();
  const key = useIdempotencyKey();
  const fileInput = useRef<HTMLInputElement>(null);
  const creating = template === null;
  const ai = creating || template.kind === "ai_scene";
  const [names, setNames] = useState(template?.names ?? { uz: "", ru: "", en: "" });
  const [text, setText] = useState(template?.text ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [removeReference, setRemoveReference] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [hiding, setHiding] = useState(false);
  const reference = useTemplateReference((ok, message) =>
    ok
      ? toast({ tone: "success", title: copy.toast.pictureReady })
      : toast({ tone: "danger", title: t.generateFailed, description: message }),
  );

  const pick = (picked: File | undefined) => {
    if (!picked) return;
    const problem = imageFileProblem(picked, locale);
    if (problem) {
      setErrors((current) => ({ ...current, reference: problem }));
      return;
    }
    setErrors((current) => ({ ...current, reference: undefined }));
    setFile(picked);
    setRemoveReference(false);
  };

  const storedPicture = removeReference ? null : (template?.referenceUrl ?? null);
  const shownPicture = Boolean(file) || Boolean(storedPicture);
  const textChanged = text.trim() !== (template?.text ?? "").trim();
  const canGenerate = !creating && ai && Boolean(template.text) && !textChanged;

  const save = async (extra?: { enabled: boolean }) => {
    setErrors({});
    const form = new FormData();
    form.set("name.uz", names.uz);
    form.set("name.ru", names.ru);
    form.set("name.en", names.en);
    if (ai && (creating || textChanged)) form.set("text", text);
    if (file) form.set("reference", file, file.name);
    if (removeReference && !file) form.set("removeReference", "true");
    if (extra) form.set("enabled", extra.enabled ? "true" : "false");
    setSaving(true);
    const result = key.settle(
      await runAction((csrf) => saveSceneTemplateEdits(template?.id ?? null, form, key.key, csrf)),
    );
    setSaving(false);
    if (!result.ok) {
      const fieldErrors = result.fieldErrors ?? {};
      const mapped: Errors = {};
      for (const [path, message] of Object.entries(fieldErrors)) {
        const field = path.replace(/^(request|values)\./, "");
        if (field.startsWith("name"))
          mapped[(field.includes(".") ? field : "name.uz") as "name.uz"] = message;
        else if (field === "text" || field === "reference") mapped[field] = message;
        else mapped.form = message;
      }
      if (Object.keys(mapped).length === 0) mapped.form = result.error;
      setErrors(mapped);
      return false;
    }
    toast({
      tone: "success",
      title: extra ? copy.toast.hidden : creating ? copy.toast.created : copy.toast.saved,
      description: result.data.name,
    });
    onSaved?.(result.data);
    onOpenChange(false);
    return true;
  };

  const nameField = (language: "uz" | "ru" | "en", label: string) => (
    <Field label={label} error={errors[`name.${language}`]}>
      {(control) => (
        <TextInput
          {...control}
          value={names[language]}
          maxLength={TEMPLATE_NAME_MAX}
          autoComplete="off"
          lang={language}
          onChange={(event) =>
            setNames((current) => ({ ...current, [language]: event.target.value }))
          }
        />
      )}
    </Field>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!saving) onOpenChange(next);
      }}
      title={creating ? t.createTitle : t.editTitle}
      description={ai ? t.lead : undefined}
      className="max-w-[720px]"
    >
      <form
        noValidate
        data-template-editor={template?.key ?? "new"}
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <div className={cn("grid gap-5", ai && "sm:grid-cols-[200px_minmax(0,1fr)]")}>
          {ai && (
            <section
              className="mx-auto flex w-full max-w-[240px] flex-col gap-2 sm:mx-0 sm:max-w-none"
              data-field="reference"
              aria-labelledby={`${idBase}-reference`}
            >
              <span id={`${idBase}-reference`} className="text-label font-semibold text-ink">
                {t.reference}
              </span>
              <span
                className={cn(
                  "relative flex aspect-[4/5] w-full items-center justify-center overflow-hidden rounded-md border bg-surface",
                  errors.reference ? "border-danger" : "border-line",
                )}
                data-reference-preview={shownPicture ? "picture" : "empty"}
              >
                {file ? (
                  <PickedImage file={file} label={t.reference} />
                ) : storedPicture ? (
                  <Image
                    src={storedPicture}
                    alt={t.reference}
                    fill
                    sizes="200px"
                    className="object-cover"
                  />
                ) : (
                  <Icon name="image" size={28} className="text-ink-muted" />
                )}
                {reference.running && (
                  <span
                    role="status"
                    className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-surface/85 px-3 text-center text-caption font-semibold text-ink"
                  >
                    <span
                      aria-hidden="true"
                      className="size-7 animate-spin rounded-full border-[3px] border-gold-ink border-t-transparent"
                    />
                    {t.generating}
                  </span>
                )}
                {storedPicture && !file && template?.referenceSource && (
                  <span className="absolute bottom-2 left-2 rounded-full bg-surface/90 px-2 py-0.5 text-caption font-semibold text-ink shadow-sm">
                    {template.referenceSource === "generated" ? t.generated : t.uploaded}
                  </span>
                )}
              </span>
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  className={cn(
                    buttonStyles({ variant: "dashed", size: "sm" }),
                    "w-full justify-center",
                  )}
                >
                  <Icon name="upload" size={16} className="text-gold-ink" />
                  {shownPicture ? t.replace : t.upload}
                </button>
                {!creating && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full justify-center"
                    busy={reference.running}
                    disabledReason={
                      canGenerate
                        ? null
                        : textChanged || !template.text
                          ? t.generateNeedsSave
                          : null
                    }
                    onClick={() => template && void reference.start(template.id)}
                    data-template-generate=""
                  >
                    <Icon name="sparkles" size={16} className="text-gold-ink" />
                    {reference.running ? t.generating : t.generate}
                  </Button>
                )}
                {(template?.referenceUrl || file) && (
                  <button
                    type="button"
                    onClick={() => {
                      if (file) {
                        setFile(null);
                      } else {
                        setRemoveReference((current) => !current);
                      }
                    }}
                    className="self-start text-caption font-semibold text-ink underline decoration-gold-ink underline-offset-2 hover:decoration-ink"
                  >
                    {removeReference ? t.undoRemove : t.removePicture}
                  </button>
                )}
                {removeReference && (
                  <span className="text-caption text-ink-muted">{t.removed}</span>
                )}
                {file && (
                  <span className="truncate text-caption text-ink">{t.picked(file.name)}</span>
                )}
              </div>
              <span className="text-caption text-ink-muted">{t.referenceHint}</span>
              {(errors.reference || reference.error) && (
                <p
                  role="alert"
                  className="m-0 flex items-start gap-1.5 text-body-sm font-semibold text-ink"
                >
                  <Icon name="alert-circle" size={16} className="mt-px shrink-0 text-danger" />
                  {errors.reference ?? reference.error}
                </p>
              )}
              <input
                ref={fileInput}
                type="file"
                accept={IMAGE_TYPES.join(",")}
                tabIndex={-1}
                aria-hidden="true"
                className="sr-only"
                data-reference-input=""
                onChange={(event) => {
                  pick(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </section>
          )}

          <div className="flex min-w-0 flex-col gap-4">
            {nameField("uz", t.nameUz)}
            <div className="grid gap-4 sm:grid-cols-2">
              {nameField("ru", t.nameRu)}
              {nameField("en", t.nameEn)}
            </div>
            {ai ? (
              <Field
                label={t.text}
                error={errors.text}
                hint={t.textHint}
                aside={
                  <span className="text-caption text-ink-muted tabular-nums">
                    {t.count(text.length, CUSTOM_PROMPT_MAX)}
                  </span>
                }
              >
                {(control) => (
                  <textarea
                    {...control}
                    value={text}
                    rows={5}
                    maxLength={CUSTOM_PROMPT_MAX}
                    placeholder={t.textPlaceholder}
                    onChange={(event) => setText(event.target.value)}
                    className="min-h-[120px] w-full resize-y rounded-md border border-line bg-surface px-3 py-2 text-body-sm text-ink placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold-ink"
                  />
                )}
              </Field>
            ) : (
              <p className="m-0 flex items-start gap-1.5 text-body-sm text-ink-muted">
                <Icon name="info" size={16} className="mt-0.5 shrink-0 text-gold-ink" />
                {t.studioNote}
              </p>
            )}
          </div>
        </div>

        {errors.form && (
          <p
            role="alert"
            className="m-0 rounded-md bg-danger-soft px-3 py-2.5 text-body-sm text-ink"
          >
            {errors.form}
          </p>
        )}
        {saving && ai && (
          <p role="status" className="m-0 text-caption text-ink-muted">
            {t.savingLead}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line pt-4">
          {!creating && (
            <Button
              type="button"
              variant="ghost"
              className="mr-auto text-danger"
              onClick={() => setHiding(true)}
              disabledReason={saving ? t.saving : null}
            >
              <Icon name="trash" size={16} />
              {t.hide}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabledReason={saving ? t.saving : null}
          >
            {t.cancel}
          </Button>
          <Button type="submit" busy={saving}>
            <Icon name="check" size={18} />
            {saving && ai ? t.saving : t.save}
          </Button>
        </div>
      </form>

      {template && (
        <AlertDialog
          open={hiding}
          onOpenChange={(next) => {
            if (!saving) setHiding(next);
          }}
          title={t.hideTitle}
          description={
            <p className="m-0 text-[14px] leading-5 text-ink">{t.hideText(template.name)}</p>
          }
        >
          <div className="mt-1.5 flex flex-wrap justify-end gap-2">
            <AlertDialogCancel asChild>
              <Button variant="outline">{t.cancel}</Button>
            </AlertDialogCancel>
            <Button
              variant="destructive"
              busy={saving}
              onClick={async () => {
                const ok = await save({ enabled: false });
                if (ok) setHiding(false);
              }}
            >
              {t.hideConfirm}
            </Button>
          </div>
        </AlertDialog>
      )}
    </Dialog>
  );
}
