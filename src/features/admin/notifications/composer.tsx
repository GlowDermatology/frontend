"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useId, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { Controller, useForm, useWatch, type FieldErrors, type Path } from "react-hook-form";
import { z } from "zod";

import { Rings } from "@/components/brand/rings";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { Field, TextArea, TextInput, labelClass } from "@/components/ui/field";
import { FormErrorSummary } from "@/components/ui/form-errors";
import { FormDateTimePicker, FormPhoneInput, FormSelect } from "@/components/ui/form-controls";
import { Icon } from "@/components/ui/icon";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useToast } from "@/components/ui/toast";
import { saveNotificationDraft, updateNotificationDraft } from "@/data/notifications.actions";
import { notificationDataCopy } from "@/domain/copy/notifications";
import {
  BODY_MAX,
  NOTIFICATION_IMAGE_TYPES,
  TITLE_MAX,
  notificationImageProblem,
  type AudienceSegment,
  type NotificationDraft,
  type NotificationKind,
  type NotificationLink,
  type NotificationRecord,
} from "@/domain/notification";
import { fromLocalInput, toLocalInput } from "@/lib/datetime";
import { useRhfReveal } from "@/lib/forms/rhf";
import { useAdminLocale, useCopy } from "@/lib/i18n/admin-context";
import { useFormat } from "@/lib/i18n/admin-hooks";
import type { Locale } from "@/lib/i18n/locales";
import { validationCopy } from "@/lib/i18n/validation-copy";
import { isHttpsUrl, LINK_URL_MAX } from "@/lib/link-url";

import { runAction } from "../shared/action-client";
import { partitionFieldErrors } from "../shared/field-errors";
import { useIdempotencyKey } from "../shared/idempotency";
import { notificationsCopy } from "./copy";

/**
 * The campaign composer (contract §2.8, campaign approval): writes a draft
 * (`POST notifications/`, «Qoralama saqlash») or, in edit mode, changes one
 * (`PATCH notifications/{id}/` with the revision the editor opened on).
 * Nothing is sent from here: a superuser tests and approves the draft from
 * the campaign panel, and the send starts after the approval delay. The
 * "send time" is the author's requested time; without one the send may start
 * as soon as the approval delay passed. A failed submit (in the form or from
 * the server) lists the fields, toasts and reveals the first one; a promotion
 * without a tap destination asks "save anyway?" first.
 */

/**
 * The composer's rules in the admin language. `now` is the server's render
 * time: a requested send time must be in its future. The phone is the
 * `PhoneInput`'s value (`+998…`, partial while typed).
 */
export function composerSchema(now: string, locale: Locale) {
  const v = validationCopy[locale];
  const m = notificationDataCopy[locale].schema;
  return z
    .object({
      kind: z.enum(["promo", "general"]),
      title: z.string().trim().min(3, m.titleMin).max(TITLE_MAX, v.maxChars(TITLE_MAX)),
      body: z.string().trim().min(5, m.bodyMin).max(BODY_MAX, v.maxChars(BODY_MAX)),
      link: z.string(),
      linkUrl: z.string().trim().max(LINK_URL_MAX, v.maxChars(LINK_URL_MAX)),
      audience: z.enum(["all", "group", "one"]),
      segmentId: z.string(),
      phone: z.string(),
      when: z.enum(["asap", "later"]),
      scheduledAt: z.string(),
    })
    .superRefine((values, ctx) => {
      if (values.link === "url") {
        if (!values.linkUrl) {
          ctx.addIssue({ code: "custom", path: ["linkUrl"], message: m.linkUrlRequired });
        } else if (!isHttpsUrl(values.linkUrl)) {
          ctx.addIssue({ code: "custom", path: ["linkUrl"], message: m.linkUrlHttps });
        }
      }
      if (values.audience === "group" && !values.segmentId) {
        ctx.addIssue({ code: "custom", path: ["segmentId"], message: m.chooseGroup });
      }
      if (values.audience === "one" && !/^\+998\d{9}$/.test(values.phone)) {
        ctx.addIssue({ code: "custom", path: ["phone"], message: m.phone });
      }
      if (values.when === "later") {
        const at = fromLocalInput(values.scheduledAt);
        if (!at) {
          ctx.addIssue({ code: "custom", path: ["scheduledAt"], message: m.chooseTime });
        } else if (Date.parse(at) <= Date.parse(now)) {
          ctx.addIssue({ code: "custom", path: ["scheduledAt"], message: m.futureTime });
        }
      }
    });
}

type Values = z.infer<ReturnType<typeof composerSchema>>;

const linkKey = (link: NotificationLink) =>
  link.kind === "none" ? "none" : link.kind === "url" ? "url" : `product:${link.productId}`;

/** The form values of a campaign opened for editing. */
function valuesOf(
  record: NotificationRecord,
  segments: ReadonlyArray<AudienceSegment>,
  defaultSchedule: string,
): Values {
  return {
    kind: record.kind,
    title: record.title,
    body: record.body,
    link: linkKey(record.link),
    linkUrl: record.link.kind === "url" ? record.link.url : "",
    audience: record.audience.type,
    segmentId:
      record.audience.type === "group" ? record.audience.segmentId : (segments[0]?.id ?? ""),
    phone: record.audience.type === "one" ? record.audience.phone : "",
    when: record.scheduledAt ? "later" : "asap",
    scheduledAt: toLocalInput(record.scheduledAt ?? defaultSchedule),
  };
}

export interface ComposerProps {
  segments: ReadonlyArray<AudienceSegment>;
  totalDevices: number;
  linkOptions: ReadonlyArray<NotificationLink>;
  defaultSchedule: string;
  draft: NotificationDraft | null;
  /** Pre-selected single recipient (from a customer card). */
  recipient: { name: string; phone: string } | null;
  /** Server render time (ISO); the earliest allowed schedule. */
  now: string;
  /**
   * The campaign being edited («Tahrirlash» in the panel); `null` writes a
   * new draft. The parent keys the component by it, so the form mounts with
   * the campaign's values and empties when edit mode ends.
   */
  editing: NotificationRecord | null;
  onCancelEdit: () => void;
  /** A draft was saved (`created`) or changed (`updated`). */
  onSaved: (record: NotificationRecord, mode: "created" | "updated") => void;
}

export function Composer({
  segments,
  totalDevices,
  linkOptions,
  defaultSchedule,
  draft,
  recipient,
  now,
  editing,
  onCancelEdit,
  onSaved,
}: ComposerProps) {
  // React Hook Form must re-run `register` after `reset()` (see ProductEditor).
  "use no memo";
  const t = useCopy(notificationsCopy);
  const c = t.composer;
  const locale = useAdminLocale();
  const words = notificationDataCopy[locale];
  const fmt = useFormat();
  const toast = useToast();
  const idBase = useId();
  const formRef = useRef<HTMLFormElement>(null);
  // The picked file travels with the FormData; `src` is its data URL, only for the preview.
  const [image, setImage] = useState<{ name: string; src: string; file: File } | null>(null);
  // Edit mode: the stored image stays unless the admin removes or replaces it.
  const [keepStoredImage, setKeepStoredImage] = useState(true);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inFlight = useRef(false);
  // One key per compose form: reused on retries, renewed after each saved draft.
  const idempotency = useIdempotencyKey();
  const schema = useMemo(() => composerSchema(now, locale), [now, locale]);
  const resolver = useMemo(() => zodResolver(schema), [schema]);

  // The parent keys the composer by the edited campaign, so a mount is either
  // a fresh form (the demo's draft prefill, the customer card's recipient) or
  // the campaign's values.
  const defaults: Values = editing
    ? valuesOf(editing, segments, defaultSchedule)
    : {
        kind: draft?.kind ?? "promo",
        title: draft?.title ?? "",
        body: draft?.body ?? "",
        link: linkKey(draft?.link ?? { kind: "none" }),
        linkUrl: draft?.link.kind === "url" ? draft.link.url : "",
        audience: recipient ? "one" : "all",
        segmentId: segments[0]?.id ?? "",
        phone: recipient?.phone ?? "",
        when: "asap",
        scheduledAt: toLocalInput(defaultSchedule),
      };

  const {
    control,
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver, defaultValues: defaults, shouldFocusError: false });
  const labels = {
    kind: c.kind,
    title: c.title,
    body: c.body,
    link: c.link,
    linkUrl: c.linkUrl,
    audience: c.audience,
    segmentId: c.group,
    phone: c.phone,
    scheduledAt: c.whenPicker,
  };
  const errorsUi = useRhfReveal<Values>({ formRef, labels, errors });
  const [title, body, audience, segmentId, when, scheduledAt, link, linkUrl] = useWatch({
    control,
    name: ["title", "body", "audience", "segmentId", "when", "scheduledAt", "link", "linkUrl"],
  });

  const segment = segments.find((s) => s.id === segmentId) ?? segments[0];
  const selectedLink: NotificationLink =
    link === "url"
      ? { kind: "url", url: linkUrl }
      : (linkOptions.find((l) => linkKey(l) === link) ?? { kind: "none" as const });
  const storedImage = editing && keepStoredImage && !image ? editing.imageUrl : null;
  const previewAt = when === "later" ? fromLocalInput(scheduledAt) : null;

  const save = async (values: Values) => {
    const scheduled = values.when === "later" ? fromLocalInput(values.scheduledAt) : null;
    const formData = new FormData();
    formData.set("kind", values.kind);
    formData.set("title", values.title);
    formData.set("body", values.body);
    formData.set("link", linkKey(selectedLink));
    formData.set("linkUrl", selectedLink.kind === "url" ? values.linkUrl.trim() : "");
    formData.set("audience", values.audience);
    formData.set("segmentId", values.audience === "group" ? values.segmentId : "");
    formData.set("phone", values.audience === "one" ? values.phone : "");
    formData.set("scheduledAt", scheduled ?? "");
    if (image) formData.set("image", image.file, image.name);
    if (editing) {
      formData.set("expectedRevision", String(editing.revision));
      if (!keepStoredImage && !image) formData.set("removeImage", "true");
    }
    const result = idempotency.settle(
      await runAction((csrf) =>
        editing
          ? updateNotificationDraft(editing.id, formData, idempotency.key, csrf)
          : saveNotificationDraft(formData, idempotency.key, csrf),
      ),
    );
    if (!result.ok) {
      // A message for a field this form does not show (e.g. a key the remap
      // does not know, the image) still reaches the admin as a toast.
      const { fieldErrors, formError } = partitionFieldErrors(result, [
        "kind",
        "title",
        "body",
        "link",
        ...(values.link === "url" ? ["linkUrl"] : []),
        "audience",
        "scheduledAt",
        ...(values.audience === "group" ? ["segmentId"] : []),
        ...(values.audience === "one" ? ["phone"] : []),
      ]);
      const serverErrors: FieldErrors<Values> = {};
      for (const [path, message] of Object.entries(fieldErrors)) {
        setError(path as Path<Values>, { type: "server", message });
        serverErrors[path as keyof Values] = { type: "server", message };
      }
      if (formError) toast({ tone: "danger", title: c.notSaved, description: formError });
      if (Object.keys(serverErrors).length > 0) errorsUi.onInvalid(serverErrors);
      return;
    }
    errorsUi.clear();
    if (!editing) {
      reset({ ...defaults, title: "", body: "", audience: "all", phone: "" });
      if (image) setImage(null);
    }
    toast(
      editing
        ? { tone: "success", title: c.updated, description: c.updatedNote }
        : {
            tone: "success",
            title: c.saved,
            description: scheduled ? c.savedFor(fmt.dateTimeShort(scheduled)) : c.savedAsap,
          },
    );
    onSaved(result.data, editing ? "updated" : "created");
  };

  const onValid = async (values: Values) => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      // A promotion without a tap destination is asked about when it is tested or approved
      // (`CampaignPanel`), not here: a draft may be saved half done.
      await save(values);
    } finally {
      inFlight.current = false;
    }
  };

  const onImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    // Checked before upload with the contract's rules; the server re-checks.
    const problem = notificationImageProblem(file, locale);
    if (problem) return setImageError(problem);
    setImageError(null);
    // The preview is the file's data URL (at most 5 MB after the check above); the file itself
    // is what the FormData carries.
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string")
        setImage({ name: file.name, src: reader.result, file });
    };
    reader.readAsDataURL(file);
  };

  const audienceCards = [
    { value: "all", label: c.audienceAll, detail: c.devices(totalDevices) },
    {
      value: "group",
      label: c.audienceGroup,
      detail: segment ? `${segment.name} · ${fmt.number(segment.size)}` : c.noGroups,
    },
    {
      value: "one",
      label: c.audienceOne,
      detail: recipient && audience === "one" ? recipient.name : c.byPhone,
    },
  ] as const;
  const imageErrorId = `${idBase}-image-error`;
  const busyReason = isSubmitting ? c.savingReason : null;

  return (
    <div id="composer" className="flex scroll-mt-4 flex-wrap items-start gap-4">
      <Card aria-labelledby={`${idBase}-new`} className="min-w-0 flex-[3_1_560px]">
        <form
          ref={formRef}
          noValidate
          onSubmit={(event) => handleSubmit(onValid, errorsUi.onInvalid)(event)}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <CardTitle id={`${idBase}-new`} className="text-heading break-words">
              {editing ? c.editTitle(editing.title) : c.newTitle}
            </CardTitle>
            <span className="text-caption font-normal text-ink-muted">
              {editing ? c.editNote(t.revision(editing.revision)) : c.newNote}
            </span>
          </div>

          <FormErrorSummary errors={errorsUi.summary} onSelect={errorsUi.select} />

          <div className="flex flex-col gap-2" data-field="kind">
            <span aria-hidden="true" className={labelClass}>
              {c.kind}
            </span>
            <Controller
              control={control}
              name="kind"
              render={({ field }) => (
                <SegmentedControl<NotificationKind>
                  label={c.kind}
                  size="sm"
                  value={field.value}
                  onChange={field.onChange}
                  options={[
                    { value: "promo", label: words.kind.promo },
                    { value: "general", label: words.kind.general },
                  ]}
                  className="self-start"
                />
              )}
            />
            {errors.kind && <InlineError>{errors.kind.message}</InlineError>}
          </div>

          <Field
            label={c.title}
            name="title"
            error={errors.title?.message}
            hint={
              <span className="block text-caption tabular-nums">
                {fmt.number(title.length)} / {fmt.number(TITLE_MAX)}
              </span>
            }
          >
            {(props) => (
              <TextInput
                {...props}
                {...register("title")}
                maxLength={TITLE_MAX}
                autoComplete="off"
              />
            )}
          </Field>
          <Field
            label={c.body}
            name="body"
            error={errors.body?.message}
            hint={
              <span className="block text-caption tabular-nums">
                {fmt.number(body.length)} / {fmt.number(BODY_MAX)}
              </span>
            }
          >
            {(props) => <TextArea {...props} {...register("body")} rows={3} maxLength={BODY_MAX} />}
          </Field>

          <div className="flex flex-wrap gap-3">
            <div
              className="flex min-h-16 min-w-0 flex-[1_1_200px] rounded-md"
              data-field="image"
              data-invalid={imageError ? "true" : undefined}
              tabIndex={imageError ? -1 : undefined}
            >
              {image || storedImage ? (
                <div className="flex min-w-0 flex-1 items-center gap-3 rounded-md border-[1.5px] border-line-strong px-3.5 py-2.5">
                  {/* Local preview of an unsaved upload (data URL) or the stored image. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image?.src ?? storedImage ?? ""}
                    alt=""
                    className="h-10 w-20 shrink-0 rounded-sm object-cover"
                  />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-[14px] leading-5 font-bold text-ink">{c.image}</span>
                    <span className="truncate text-caption font-normal text-ink-muted">
                      {image?.name ?? c.storedImage}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setImage(null);
                      setKeepStoredImage(false);
                    }}
                    aria-label={c.removeImage}
                    className="flex size-9 shrink-0 items-center justify-center rounded-md text-danger hover:bg-danger-soft"
                  >
                    <Icon name="trash" size={18} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  aria-describedby={imageError ? imageErrorId : undefined}
                  className={`flex flex-1 items-center gap-3 rounded-md border-[1.5px] border-dashed px-3.5 py-2.5 text-left text-ink transition-colors duration-150 hover:bg-surface ${imageError ? "border-danger" : "border-line-strong"}`}
                >
                  <Icon name="image" size={22} className="shrink-0 text-gold-ink" />
                  <span className="flex flex-col">
                    <span className="text-[14px] leading-5 font-bold">{c.imageOptional}</span>
                    <span className="text-caption font-normal text-ink-muted">{c.imageHint}</span>
                  </span>
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept={NOTIFICATION_IMAGE_TYPES.join(",")}
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
                onChange={onImage}
              />
            </div>
            <div className="flex min-w-0 flex-[1_1_200px]" data-field="link">
              <Controller
                control={control}
                name="link"
                render={({ field }) => (
                  <Combobox<string>
                    label={c.link}
                    placeholder={c.linkSearch}
                    align="end"
                    value={field.value}
                    onValueChange={field.onChange}
                    invalid={Boolean(errors.link)}
                    describedBy={errors.link ? `${idBase}-link-error` : undefined}
                    triggerClassName="h-auto min-h-16 w-full min-w-0 gap-3 border-[1.5px] px-3.5 py-2.5 text-left whitespace-normal"
                    trigger={
                      <>
                        <Icon name="link" size={22} className="shrink-0 text-gold-ink" />
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="text-[14px] leading-5 font-bold">
                            {c.linkKind[selectedLink.kind]}
                          </span>
                          <span className="text-caption font-normal [overflow-wrap:anywhere] break-words text-ink-muted">
                            {selectedLink.kind === "product"
                              ? selectedLink.label
                              : selectedLink.kind === "url"
                                ? selectedLink.url || c.linkEnterAddress
                                : c.linkHome}
                          </span>
                        </span>
                      </>
                    }
                    options={[
                      ...linkOptions.slice(0, 1),
                      { kind: "url" as const, url: "" },
                      ...linkOptions.slice(1),
                    ].map((option) => {
                      const text =
                        option.kind === "none"
                          ? c.linkOption.none
                          : option.kind === "url"
                            ? c.linkOption.url
                            : c.linkOption.product(option.label);
                      return { value: linkKey(option), label: text, text };
                    })}
                  />
                )}
              />
            </div>
          </div>
          {errors.link && (
            <InlineError id={`${idBase}-link-error`}>{errors.link.message}</InlineError>
          )}
          {imageError && <InlineError id={imageErrorId}>{imageError}</InlineError>}
          {link === "url" && (
            <Field
              label={c.linkUrl}
              name="linkUrl"
              error={errors.linkUrl?.message}
              hint={c.linkUrlHint}
            >
              {(props) => (
                <TextInput
                  {...props}
                  {...register("linkUrl")}
                  type="url"
                  inputMode="url"
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={LINK_URL_MAX}
                  placeholder={c.linkUrlPlaceholder}
                />
              )}
            </Field>
          )}

          <div className="flex flex-col gap-2" data-field="audience">
            <span id={`${idBase}-audience`} className={labelClass}>
              {c.audience}
            </span>
            <div
              role="radiogroup"
              aria-labelledby={`${idBase}-audience`}
              className="grid grid-cols-[repeat(auto-fit,minmax(min(160px,100%),1fr))] gap-2"
            >
              {audienceCards.map((card) => (
                <label key={card.value} className="relative flex min-w-0">
                  <input
                    type="radio"
                    value={card.value}
                    {...register("audience")}
                    className="peer absolute inset-0 m-0 cursor-pointer appearance-none rounded-md focus-visible:outline-none"
                  />
                  <span className="pointer-events-none flex min-h-16 w-full min-w-0 flex-col items-start gap-0.5 rounded-md border border-line-strong bg-surface-raised px-3.5 py-2.5 text-ink transition-colors duration-150 peer-checked:border-2 peer-checked:border-gold peer-checked:bg-gold-soft peer-hover:peer-not-checked:bg-surface peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold-ink peer-checked:[&>span:last-child]:text-ink">
                    <span className="text-[14px] leading-5 font-bold">{card.label}</span>
                    <span className="max-w-full truncate text-caption font-normal text-ink-muted tabular-nums">
                      {card.detail}
                    </span>
                  </span>
                </label>
              ))}
            </div>
            {errors.audience && <InlineError>{errors.audience.message}</InlineError>}
          </div>

          {audience === "group" && (
            <div className="flex flex-wrap items-center gap-3">
              {segments.length > 0 && (
                <Field
                  label={c.group}
                  name="segmentId"
                  error={errors.segmentId?.message}
                  className="w-[320px] max-w-full"
                >
                  {(props) => (
                    <FormSelect
                      {...props}
                      control={control}
                      name="segmentId"
                      options={segments.map((s) => ({
                        value: s.id,
                        label: s.name,
                        description: c.devices(s.size),
                      }))}
                    />
                  )}
                </Field>
              )}
              <Link
                href="/admin/customers/groups"
                className="text-body-sm font-semibold text-ink underline decoration-gold underline-offset-4"
              >
                {segments.length > 0 ? c.manageGroups : c.createGroup}
              </Link>
              {segments.length === 0 && errors.segmentId && (
                <InlineError className="basis-full">{errors.segmentId.message}</InlineError>
              )}
            </div>
          )}
          {audience === "one" && (
            <Field
              label={c.phone}
              name="phone"
              error={errors.phone?.message}
              className="max-w-[320px]"
            >
              {(props) => <FormPhoneInput {...props} control={control} name="phone" />}
            </Field>
          )}

          <div className="flex flex-wrap items-start gap-3">
            <Controller
              control={control}
              name="when"
              render={({ field }) => (
                <SegmentedControl<"asap" | "later">
                  label={c.when}
                  size="sm"
                  value={field.value}
                  onChange={field.onChange}
                  options={[
                    { value: "asap", label: c.asap },
                    { value: "later", label: c.later },
                  ]}
                />
              )}
            />
            {when === "later" && (
              <Field
                label={c.whenPicker}
                name="scheduledAt"
                error={errors.scheduledAt?.message}
                className="w-[260px] max-w-full [&>label]:sr-only"
              >
                {(props) => (
                  <FormDateTimePicker
                    {...props}
                    control={control}
                    name="scheduledAt"
                    min={toLocalInput(now)}
                  />
                )}
              </Field>
            )}
            <span className="flex-1" />
            {editing && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancelEdit}
                disabledReason={busyReason}
              >
                {c.cancelEdit}
              </Button>
            )}
            <Button type="submit" className="px-5" busy={isSubmitting}>
              <Icon name={editing ? "check" : "send"} size={18} />
              {isSubmitting ? c.saving : editing ? c.save : c.saveDraft}
            </Button>
          </div>
        </form>
      </Card>

      <section
        aria-labelledby={`${idBase}-preview`}
        className="relative flex min-w-0 flex-[2_1_340px] flex-col gap-4 overflow-hidden rounded-lg bg-banner p-5"
      >
        <Rings
          viewBox={400}
          rings={[
            [70, 0.5],
            [110, 0.32],
            [150, 0.18],
            [190, 0.08],
          ]}
          className="absolute top-[58%] left-1/2 size-[520px] -translate-x-1/2 -translate-y-1/2"
        />
        <h2
          id={`${idBase}-preview`}
          className="relative m-0 text-[11px] leading-[14px] font-bold tracking-[0.08em] text-banner-ink uppercase"
        >
          {c.previewHeading}
        </h2>
        <div className="relative mt-6 mb-8 flex gap-3 rounded-lg bg-[#fbf8f2f2] p-3.5 shadow-[0_18px_40px_-12px_#000000aa]">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-[#2b2620] text-[#c9a24b]">
            <Icon name="bell" size={20} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="flex justify-between gap-2 text-caption font-normal text-[#7a705d]">
              <span className="font-bold uppercase">Glow Derma</span>
              <span className="truncate">
                {previewAt ? fmt.dateTimeShort(previewAt) : c.previewAsap}
              </span>
            </span>
            <span className="text-[15px] leading-5 font-bold [overflow-wrap:anywhere] break-words text-[#2a2418]">
              {title.trim() || c.previewTitle}
            </span>
            <span className="line-clamp-4 text-[14px] leading-5 [overflow-wrap:anywhere] break-words text-[#2a2418]">
              {body.trim() || c.previewBody}
            </span>
            {(image || storedImage) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={image?.src ?? storedImage ?? ""}
                alt=""
                className="mt-2 aspect-[2/1] w-full rounded-md object-cover"
              />
            )}
          </span>
        </div>
        <p className="relative m-0 text-[12px] leading-[18px] text-banner-ink-soft">
          {c.previewNote}
        </p>
      </section>
    </div>
  );
}

/** A form-level message under a control that has no `Field` of its own. */
export function InlineError({
  id,
  className,
  children,
}: {
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <p
      id={id}
      role="alert"
      className={`m-0 flex items-start gap-1.5 text-body-sm font-semibold text-ink ${className ?? ""}`}
    >
      <Icon name="alert-circle" size={16} className="mt-px shrink-0 text-danger" />
      {children}
    </p>
  );
}
