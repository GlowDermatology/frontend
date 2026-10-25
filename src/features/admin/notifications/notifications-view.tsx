"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useEffect, useId, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { Controller, useForm, useWatch, type Path } from "react-hook-form";
import { z } from "zod";

import { Rings } from "@/components/brand/rings";
import { ScrollRegion } from "@/components/ui/scroll-region";
import { Badge, type Tone } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogCancel } from "@/components/ui/dialog";
import { Field, TextArea, TextInput, labelClass } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Combobox } from "@/components/ui/combobox";
import { SelectMenu } from "@/components/ui/menu";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useToast } from "@/components/ui/toast";
import { sendNotification } from "@/data/notifications.actions";
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
  type NotificationState,
} from "@/domain/notification";
import { cn } from "@/lib/cn";
import { formatDateTimeShort, formatNumber, formatPhone } from "@/lib/format";
import { maskPhone } from "@/lib/phone";

import { runAction } from "../shared/action-client";
import { partitionFieldErrors } from "../shared/field-errors";
import { useIdempotencyKey } from "../shared/idempotency";

const KIND_LABEL: Record<NotificationKind, string> = { promo: "Aksiya", general: "Umumiy" };

const STATE_BADGE: Record<NotificationState, { label: string; tone: Tone }> = {
  scheduled: { label: "Rejalashtirilgan", tone: "gold" },
  queued: { label: "Navbatda", tone: "warning" },
  sent: { label: "Yuborildi", tone: "success" },
};

/** "2026-10-26T10:00" (datetime-local, Tashkent) ↔ ISO with +05:00. */
const toLocalInput = (iso: string) => {
  const shifted = new Date(new Date(iso).getTime() + 5 * 3_600_000);
  return shifted.toISOString().slice(0, 16);
};
const fromLocalInput = (value: string) => `${value}:00+05:00`;

const phoneDigits = (value: string) => value.replace(/\D/g, "");

/** `now` is the server's render time: the schedule must be in its future. */
const buildSchema = (now: string) =>
  z
    .object({
      kind: z.enum(["promo", "general"]),
      title: z
        .string()
        .trim()
        .min(3, "Sarlavhani kiriting (kamida 3 belgi).")
        .max(TITLE_MAX, `${TITLE_MAX} belgidan oshmasin.`),
      body: z
        .string()
        .trim()
        .min(5, "Xabar matnini kiriting.")
        .max(BODY_MAX, `${BODY_MAX} belgidan oshmasin.`),
      link: z.string(),
      audience: z.enum(["all", "group", "one"]),
      segmentId: z.string(),
      phone: z.string(),
      when: z.enum(["now", "later"]),
      scheduledAt: z.string(),
    })
    .superRefine((values, ctx) => {
      if (values.audience === "one" && !/^998\d{9}$/.test(phoneDigits(values.phone))) {
        ctx.addIssue({
          code: "custom",
          path: ["phone"],
          message: "Telefon raqamni +998 XX XXX XX XX ko‘rinishida kiriting.",
        });
      }
      if (
        values.when === "later" &&
        (!values.scheduledAt || new Date(fromLocalInput(values.scheduledAt)) <= new Date(now))
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["scheduledAt"],
          message: "Kelajakdagi vaqtni tanlang.",
        });
      }
    });

type Values = z.infer<ReturnType<typeof buildSchema>>;

const linkKey = (link: NotificationLink) =>
  link.kind === "none" ? "none" : `product:${link.productId}`;
const linkLabel = (link: NotificationLink) =>
  link.kind === "none" ? "Bosilganda: ilova ochiladi" : "Bosilganda: mahsulot";

interface NotificationsViewProps {
  history: ReadonlyArray<NotificationRecord>;
  /** All campaigns on the server; the history shows the first page. */
  historyTotal: number;
  segments: ReadonlyArray<AudienceSegment>;
  totalDevices: number;
  linkOptions: ReadonlyArray<NotificationLink>;
  defaultSchedule: string;
  draft: NotificationDraft | null;
  /** Pre-selected single recipient (from a customer card). */
  recipient: { name: string; phone: string } | null;
  /** Server render time (ISO); the earliest allowed schedule. */
  now: string;
}

export function NotificationsView({
  history: initialHistory,
  historyTotal,
  segments,
  totalDevices,
  linkOptions,
  defaultSchedule,
  draft,
  recipient,
  now,
}: NotificationsViewProps) {
  // React Hook Form must re-run `register` after `reset()` (see ProductEditor).
  "use no memo";
  const toast = useToast();
  const idBase = useId();
  // A newer server history (the refresh after an api-mode send, a navigation
  // back to the kept-mounted route) replaces the local one; a send prepends
  // its answer locally so mock mode, which persists nothing, shows it too.
  const [historySource, setHistorySource] = useState(initialHistory);
  const [history, setHistory] = useState(initialHistory);
  if (initialHistory !== historySource) {
    setHistorySource(initialHistory);
    setHistory(initialHistory);
  }
  const [confirmOpen, setConfirmOpen] = useState(false);
  // The picked file travels with the FormData; the object URL is only the preview.
  const [image, setImage] = useState<{ name: string; src: string; file: File } | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // One key per compose form: reused on retries, renewed after each sent message.
  const idempotency = useIdempotencyKey();
  const [schema] = useState(() => buildSchema(now));

  const defaults: Values = {
    kind: draft?.kind ?? "promo",
    title: draft?.title ?? "",
    body: draft?.body ?? "",
    link: linkKey(draft?.link ?? { kind: "none" }),
    audience: recipient ? "one" : "all",
    segmentId: segments[0]?.id ?? "",
    phone: recipient ? formatPhone(recipient.phone) : "",
    when: "now",
    scheduledAt: toLocalInput(defaultSchedule),
  };

  const {
    control,
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: defaults });
  const [title, body, audience, segmentId, when, scheduledAt, link] = useWatch({
    control,
    name: ["title", "body", "audience", "segmentId", "when", "scheduledAt", "link"],
  });

  useEffect(
    () => () => {
      if (image) URL.revokeObjectURL(image.src);
    },
    [image],
  );

  const segment = segments.find((s) => s.id === segmentId) ?? segments[0];
  const selectedLink = linkOptions.find((l) => linkKey(l) === link) ?? { kind: "none" as const };
  const recipients =
    audience === "all" ? totalDevices : audience === "group" ? (segment?.size ?? 0) : 1;

  const submit = async (values: Values) => {
    const scheduled = values.when === "later" ? fromLocalInput(values.scheduledAt) : null;
    const formData = new FormData();
    formData.set("kind", values.kind);
    formData.set("title", values.title);
    formData.set("body", values.body);
    formData.set("link", linkKey(selectedLink));
    formData.set("audience", values.audience);
    formData.set("segmentId", values.audience === "group" ? values.segmentId : "");
    formData.set("phone", values.audience === "one" ? `+${phoneDigits(values.phone)}` : "");
    formData.set("scheduledAt", scheduled ?? "");
    if (image) formData.set("image", image.file, image.name);
    const result = idempotency.settle(
      await runAction((csrf) => sendNotification(formData, idempotency.key, csrf)),
    );
    setConfirmOpen(false);
    if (!result.ok) {
      // A message for a field this form does not show (e.g. a key the remap
      // does not know) still reaches the admin as a toast.
      const { fieldErrors, formError } = partitionFieldErrors(result, [
        "kind",
        "title",
        "body",
        "link",
        "audience",
        "scheduledAt",
        ...(values.audience === "group" ? ["segmentId"] : []),
        ...(values.audience === "one" ? ["phone"] : []),
      ]);
      for (const [path, message] of Object.entries(fieldErrors)) {
        setError(path as Path<Values>, { message });
      }
      if (formError) toast({ tone: "info", title: "Yuborilmadi", description: formError });
      return;
    }
    setHistory((current) => [result.data, ...current]);
    reset({ ...defaults, title: "", body: "", audience: "all", phone: "" });
    if (image) setImage(null);
    toast(
      scheduled
        ? {
            title: `Xabar ${formatDateTimeShort(scheduled)} ga rejalashtirildi`,
            description: "Tarixda ko‘rinadi",
          }
        : result.data.state === "sent"
          ? {
              title: "Xabar yuborildi",
              description: `${formatNumber(result.data.sent ?? 0)} ta qurilmaga yetkazishga topshirildi`,
            }
          : { title: "Xabar yuborilmoqda", description: "Navbatga qo‘yildi, qismlab yuboriladi" },
    );
  };

  // Sending now reaches every selected device at once: confirm first.
  const onSubmit = handleSubmit((values) => {
    if (values.when === "now") setConfirmOpen(true);
    else return submit(values);
  });

  const onImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    // Checked before upload with the contract's messages; the server re-checks.
    const problem = notificationImageProblem(file);
    if (problem) return setImageError(problem);
    setImageError(null);
    setImage({ name: file.name, src: URL.createObjectURL(file), file });
  };

  const audienceCards = [
    { value: "all", label: "Barcha mijozlar", detail: `${formatNumber(totalDevices)} ta qurilma` },
    {
      value: "group",
      label: "Guruh",
      detail: segment ? `${segment.name} · ${formatNumber(segment.size)}` : "Guruh yo‘q",
    },
    {
      value: "one",
      label: "Bitta mijoz",
      detail: recipient && audience === "one" ? recipient.name : "Telefon bo‘yicha qidirish",
    },
  ] as const;

  return (
    <>
      <div className="flex flex-col gap-1">
        <span className="text-body-sm text-ink-muted">Push bildirishnomalar · Firebase</span>
        <h1 className="m-0 font-serif text-display leading-10 tracking-normal text-ink">
          Bildirishnomalar
        </h1>
      </div>

      <div className="flex flex-wrap items-start gap-4">
        <Card aria-labelledby={`${idBase}-new`} className="min-w-0 flex-[3_1_560px]">
          <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
            <CardTitle id={`${idBase}-new`} className="text-heading">
              Yangi xabar
            </CardTitle>

            <div className="flex flex-col gap-2">
              <span aria-hidden="true" className={labelClass}>
                Turi
              </span>
              <Controller
                control={control}
                name="kind"
                render={({ field }) => (
                  <SegmentedControl<NotificationKind>
                    label="Turi"
                    size="sm"
                    value={field.value}
                    onChange={field.onChange}
                    options={[
                      { value: "promo", label: KIND_LABEL.promo },
                      { value: "general", label: KIND_LABEL.general },
                    ]}
                    className="self-start"
                  />
                )}
              />
              {errors.kind && <InlineError>{errors.kind.message}</InlineError>}
            </div>

            <Field
              label="Sarlavha"
              error={errors.title?.message}
              hint={
                <span className="block text-caption tabular-nums">
                  {title.length} / {TITLE_MAX}
                </span>
              }
            >
              {(c) => (
                <TextInput {...c} {...register("title")} maxLength={TITLE_MAX} autoComplete="off" />
              )}
            </Field>
            <Field label="Matn" error={errors.body?.message}>
              {(c) => <TextArea {...c} {...register("body")} rows={3} maxLength={BODY_MAX} />}
            </Field>

            <div className="flex flex-wrap gap-3">
              <div className="flex min-h-16 flex-[1_1_200px]">
                {image ? (
                  <div className="flex flex-1 items-center gap-3 rounded-md border-[1.5px] border-line-strong px-3.5 py-2.5">
                    {/* Local preview of an unsaved upload (object URL). */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image.src} alt="" className="h-10 w-20 rounded-sm object-cover" />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-[14px] leading-5 font-bold text-ink">Rasm</span>
                      <span className="truncate text-caption font-normal text-ink-muted">
                        {image.name}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setImage(null)}
                      aria-label="Rasmni olib tashlash"
                      className="flex size-9 items-center justify-center rounded-md text-danger hover:bg-danger-soft"
                    >
                      <Icon name="trash" size={18} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="flex flex-1 items-center gap-3 rounded-md border-[1.5px] border-dashed border-line-strong px-3.5 py-2.5 text-left text-ink transition-colors duration-150 hover:bg-surface"
                  >
                    <Icon name="image" size={22} className="shrink-0 text-gold-ink" />
                    <span className="flex flex-col">
                      <span className="text-[14px] leading-5 font-bold">Rasm (ixtiyoriy)</span>
                      <span className="text-caption font-normal text-ink-muted">
                        JPEG, PNG yoki WebP · 5 MB gacha, 2:1
                      </span>
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
              <Controller
                control={control}
                name="link"
                render={({ field }) => (
                  <Combobox<string>
                    label="Bosilganda ochiladigan sahifa"
                    placeholder="Mahsulot nomi bo‘yicha qidirish"
                    align="end"
                    value={field.value}
                    onValueChange={field.onChange}
                    invalid={Boolean(errors.link)}
                    describedBy={errors.link ? `${idBase}-link-error` : undefined}
                    triggerClassName="h-auto min-h-16 flex-[1_1_200px] gap-3 border-[1.5px] px-3.5 py-2.5 text-left whitespace-normal"
                    trigger={
                      <>
                        <Icon name="link" size={22} className="shrink-0 text-gold-ink" />
                        <span className="flex flex-1 flex-col">
                          <span className="text-[14px] leading-5 font-bold">
                            {linkLabel(selectedLink)}
                          </span>
                          <span className="text-caption font-normal text-ink-muted">
                            {selectedLink.kind === "product" ? selectedLink.label : "Bosh sahifa"}
                          </span>
                        </span>
                      </>
                    }
                    options={linkOptions.map((option) => {
                      const text =
                        option.kind === "none"
                          ? "Ilovaning bosh sahifasi"
                          : `Mahsulot: ${option.label}`;
                      return { value: linkKey(option), label: text, text };
                    })}
                  />
                )}
              />
            </div>
            {errors.link && (
              <InlineError id={`${idBase}-link-error`}>{errors.link.message}</InlineError>
            )}
            {imageError && <InlineError>{imageError}</InlineError>}

            <div className="flex flex-col gap-2">
              <span id={`${idBase}-audience`} className={labelClass}>
                Kimga
              </span>
              <div
                role="radiogroup"
                aria-labelledby={`${idBase}-audience`}
                className="grid grid-cols-[repeat(auto-fit,minmax(min(160px,100%),1fr))] gap-2"
              >
                {audienceCards.map((card) => (
                  <label key={card.value} className="relative flex">
                    <input
                      type="radio"
                      value={card.value}
                      {...register("audience")}
                      className="peer absolute inset-0 m-0 cursor-pointer appearance-none rounded-md focus-visible:outline-none"
                    />
                    <span className="pointer-events-none flex min-h-16 w-full flex-col items-start gap-0.5 rounded-md border border-line-strong bg-surface-raised px-3.5 py-2.5 text-ink transition-colors duration-150 peer-checked:border-2 peer-checked:border-gold peer-checked:bg-gold-soft peer-hover:peer-not-checked:bg-surface peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold-ink peer-checked:[&>span:last-child]:text-ink">
                      <span className="text-[14px] leading-5 font-bold">{card.label}</span>
                      <span className="text-caption font-normal text-ink-muted tabular-nums">
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
                  <Controller
                    control={control}
                    name="segmentId"
                    render={({ field }) => (
                      <SelectMenu<string>
                        label="Guruh"
                        value={field.value}
                        onValueChange={field.onChange}
                        trigger={`Guruh: ${segment?.name ?? ""}`}
                        options={segments.map((s) => ({
                          value: s.id,
                          label: `${s.name} · ${formatNumber(s.size)}`,
                        }))}
                      />
                    )}
                  />
                )}
                <Link
                  href="/admin/customers/groups"
                  className="text-body-sm font-semibold text-ink underline decoration-gold underline-offset-4"
                >
                  {segments.length > 0 ? "Guruhlarni boshqarish" : "Guruh yaratish"}
                </Link>
                {errors.segmentId && (
                  <p className="m-0 flex basis-full items-start gap-1.5 text-body-sm font-semibold text-ink">
                    <Icon name="alert-circle" size={16} className="mt-px shrink-0 text-danger" />
                    {errors.segmentId.message}
                  </p>
                )}
              </div>
            )}
            {audience === "one" && (
              <Field label="Mijoz telefoni" error={errors.phone?.message} className="max-w-[320px]">
                {(c) => (
                  <TextInput
                    {...c}
                    {...register("phone", {
                      onChange: (event) => setValue("phone", maskPhone(event.target.value)),
                    })}
                    type="tel"
                    inputMode="tel"
                    autoComplete="off"
                    placeholder="+998 90 123 45 67"
                    className="tabular-nums"
                  />
                )}
              </Field>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <Controller
                control={control}
                name="when"
                render={({ field }) => (
                  <SegmentedControl<"now" | "later">
                    label="Yuborish vaqti"
                    size="sm"
                    value={field.value}
                    onChange={field.onChange}
                    options={[
                      { value: "now", label: "Hozir" },
                      { value: "later", label: "Rejalashtirish" },
                    ]}
                  />
                )}
              />
              {when === "later" && (
                <label className="flex h-11 items-center gap-2 rounded-md border-[1.5px] border-line-strong px-3 text-ink focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-gold-ink has-[[aria-invalid=true]]:border-danger">
                  <Icon name="calendar" size={18} className="text-gold-ink" />
                  <span className="sr-only">Yuborish vaqti (Toshkent)</span>
                  <input
                    type="datetime-local"
                    {...register("scheduledAt")}
                    min={toLocalInput(now)}
                    aria-invalid={errors.scheduledAt ? true : undefined}
                    aria-describedby={errors.scheduledAt ? `${idBase}-when-error` : undefined}
                    className="bg-transparent text-[14px] font-semibold tabular-nums focus-visible:outline-none"
                  />
                </label>
              )}
              <span className="flex-1" />
              <Button
                type="submit"
                className="px-5"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
              >
                <Icon name="send" size={18} />
                {when === "later" ? "Rejalashtirish" : "Yuborish"}
              </Button>
            </div>
            {errors.scheduledAt && (
              <p
                id={`${idBase}-when-error`}
                className="m-0 flex items-start gap-1.5 text-body-sm font-semibold text-ink"
              >
                <Icon name="alert-circle" size={16} className="mt-px shrink-0 text-danger" />
                {errors.scheduledAt.message}
              </p>
            )}
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
            className="relative m-0 text-[11px] leading-[14px] font-bold tracking-[0.08em] text-banner-ink"
          >
            TELEFONDA KO‘RINISHI
          </h2>
          <div className="relative mt-6 mb-8 flex gap-3 rounded-lg bg-[#fbf8f2f2] p-3.5 shadow-[0_18px_40px_-12px_#000000aa]">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-[#2b2620] text-[#c9a24b]">
              <Icon name="bell" size={20} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="flex justify-between gap-2 text-caption font-normal text-[#7a705d]">
                <span className="font-bold">GLOW DERMA</span>
                <span>
                  {when === "later" && scheduledAt
                    ? formatDateTimeShort(fromLocalInput(scheduledAt))
                    : "hozir"}
                </span>
              </span>
              <span className="text-[15px] leading-5 font-bold break-words text-[#2a2418]">
                {title.trim() || "Sarlavha"}
              </span>
              <span className="text-[14px] leading-5 break-words text-[#2a2418]">
                {body.trim() || "Xabar matni shu yerda ko‘rinadi"}
              </span>
              {image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={image.src}
                  alt=""
                  className="mt-2 aspect-[2/1] w-full rounded-md object-cover"
                />
              )}
            </span>
          </div>
          <p className="relative m-0 text-[12px] leading-[18px] text-banner-ink-soft">
            Mijoz o‘z tilida ko‘radi: ruscha va inglizcha matnlar bo‘lmasa, o‘zbekchasi yuboriladi.
          </p>
        </section>
      </div>

      <section
        aria-labelledby={`${idBase}-history`}
        className="overflow-hidden rounded-lg bg-surface-raised shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <CardTitle id={`${idBase}-history`} className="text-heading">
            Tarix
          </CardTitle>
          <span className="text-caption font-normal text-ink-muted">
            {historyTotal > history.length
              ? `Oxirgi ${formatNumber(history.length)} ta xabar (jami ${formatNumber(historyTotal)}). `
              : ""}
            Buyurtma holati xabarlari avtomatik yuboriladi va bu yerda ko‘rsatilmaydi
          </span>
        </div>
        <ScrollRegion label="Yuborilgan xabarlar">
          <table className="data-table min-w-[860px]">
            <thead>
              <tr>
                <th scope="col">SANA</th>
                <th scope="col">TURI</th>
                <th scope="col">SARLAVHA</th>
                <th scope="col">KIMGA</th>
                <th scope="col" className="text-right!">
                  YUBORILDI
                </th>
                <th scope="col" className="text-right!">
                  YETKAZILDI
                </th>
                <th scope="col">HOLAT</th>
              </tr>
            </thead>
            <tbody>
              {history.map((record) => {
                const badge = STATE_BADGE[record.state];
                return (
                  <tr key={record.id}>
                    <td className="text-ink-muted! tabular-nums">
                      <time dateTime={record.at}>{formatDateTimeShort(record.at)}</time>
                    </td>
                    <td>{KIND_LABEL[record.kind]}</td>
                    <td>
                      <span className="flex flex-col">
                        <span className="font-semibold">{record.title}</span>
                        {(record.linkLabel || record.author) && (
                          <span className="text-[12px] text-ink-muted">
                            {[record.linkLabel && `→ ${record.linkLabel}`, record.author]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="tabular-nums">{record.audienceLabel}</td>
                    <td
                      className={cn(
                        "text-right tabular-nums",
                        record.sent === null && "text-ink-muted!",
                      )}
                    >
                      {record.sent === null ? "—" : formatNumber(record.sent)}
                      {record.failed ? (
                        <span className="block text-[12px] text-danger-strong">
                          {formatNumber(record.failed)} ta xato
                        </span>
                      ) : null}
                    </td>
                    <td
                      className={cn(
                        "text-right tabular-nums",
                        record.delivered === null && "text-ink-muted!",
                      )}
                    >
                      {record.delivered === null ? "—" : formatNumber(record.delivered)}
                    </td>
                    <td>
                      <Badge tone={badge.tone}>{badge.label}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </ScrollRegion>
      </section>

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(open) => !isSubmitting && setConfirmOpen(open)}
        title="Xabar hozir yuborilsinmi?"
        description={
          <p className="m-0 text-[14px] leading-5 text-ink">
            «{title.trim()}» {formatNumber(recipients)} ta qurilmaga yuboriladi. Yuborilgan xabarni
            qaytarib bo‘lmaydi.
          </p>
        }
      >
        <div className="mt-1.5 flex flex-wrap justify-end gap-2">
          <AlertDialogCancel
            disabled={isSubmitting}
            className={buttonStyles({ variant: "outline" })}
          >
            Orqaga
          </AlertDialogCancel>
          <Button
            onClick={() => handleSubmit(submit)()}
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            <Icon name="send" size={18} />
            {isSubmitting ? "Yuborilmoqda…" : "Yuborish"}
          </Button>
        </div>
      </AlertDialog>
    </>
  );
}

/** A form-level message under a control that has no `Field` of its own. */
function InlineError({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p
      id={id}
      role="alert"
      className="m-0 flex items-start gap-1.5 text-body-sm font-semibold text-ink"
    >
      <Icon name="alert-circle" size={16} className="mt-px shrink-0 text-danger" />
      {children}
    </p>
  );
}
