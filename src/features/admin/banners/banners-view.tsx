"use client";

import Image from "next/image";
import { useRef, useState } from "react";

import { Badge, type Tone } from "@/components/ui/badge";
import { Button, buttonStyles, IconButton } from "@/components/ui/button";
import { AlertDialog, AlertDialogCancel } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { ScrollRegion } from "@/components/ui/scroll-region";
import { useToast } from "@/components/ui/toast";
import { deleteBanner, reorderBanners } from "@/data/banners.actions";
import {
  bannerLinkText,
  bannerScheduleState,
  type Banner,
  type BannerScheduleState,
} from "@/domain/banner";
import { categoryLabel, type Category } from "@/domain/category";
import type { AdminFormatter } from "@/lib/format";
import { useAdminLocale, useCopy } from "@/lib/i18n/admin-context";
import { useFormat } from "@/lib/i18n/admin-hooks";

import { runAction } from "../shared/action-client";
import { ExportMenu } from "../shared/export-menu";
import { useIdempotencyKey } from "../shared/idempotency";
import { PageHeader } from "../shared/page-header";
import { ReorderButtons } from "../shared/reorder-buttons";
import { ListFilterBar, useListFilter } from "../shared/list-filter";
import { useRowDrag } from "../shared/row-drag";
import { upsertRow, useOrderedList } from "../shared/use-ordered-list";
import { BannerDialog, type BannerScenes } from "./banner-dialog";
import { bannersCopy, type BannersCopy } from "./copy";

interface BannersViewProps {
  banners: Banner[];
  categories: ReadonlyArray<Category>;
  /** The server's now (ISO), for the schedule state; never `new Date()` here. */
  now: string;
  exportHref: string;
  /** «AI bilan yaratish»: on when scenes and AI scenes are on; the AI templates. */
  scenes?: BannerScenes;
}

type DialogState = { mode: "create" } | { mode: "edit"; banner: Banner } | null;

const SCHEDULE_TONE: Record<BannerScheduleState, Tone> = {
  live: "success",
  scheduled: "warning",
  ended: "neutral",
  inactive: "neutral",
};

/** 72×40 box in every state (photo, local preview or placeholder), so rows never shift. */
function BannerThumb({ src, alt }: { src: string; alt: string }) {
  return (
    <span className="relative flex h-10 w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-sm bg-surface text-ink-muted">
      {src.startsWith("blob:") ? (
        // Local preview kept after a demo-mode save; next/image cannot optimise blobs.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="size-full object-cover" />
      ) : src ? (
        <Image src={src} alt={alt} fill sizes="72px" className="object-cover" />
      ) : (
        <Icon name="image" size={16} />
      )}
    </span>
  );
}

/** "24-okt, 09:00 → …" (Tashkent), or «Doimiy» without a window. */
export function windowLabel(
  banner: Pick<Banner, "startsAt" | "endsAt">,
  t: BannersCopy["list"],
  fmt: AdminFormatter,
): string {
  if (!banner.startsAt && !banner.endsAt) return t.always;
  const from = banner.startsAt ? fmt.dateTimeShort(banner.startsAt) : "…";
  const to = banner.endsAt ? fmt.dateTimeShort(banner.endsAt) : "…";
  return `${from} → ${to}`;
}

/**
 * Bannerlar: the ordered list with the create/edit dialog (image upload,
 * link, window), delete confirmation and up/down reordering (`PUT
 * banners/order/` with the exact id set). Local state mirrors the server's
 * answers so the demo works without persistence; a newer server list (the
 * refresh, or a navigation back to the page) replaces it.
 */

const idOf = (banner: Banner) => banner.id;

/** Keep local previews (demo mode) that the server does not know about. */
function keepPreviews(server: Banner[], local: Banner[]): Banner[] {
  const previews = new Map(local.map((banner) => [banner.id, banner.imageUrl]));
  return server.map((banner) =>
    banner.imageUrl ? banner : { ...banner, imageUrl: previews.get(banner.id) ?? "" },
  );
}
export function BannersView({ banners, categories, now, exportHref, scenes }: BannersViewProps) {
  const copy = useCopy(bannersCopy);
  const t = copy.list;
  const fmt = useFormat();
  const locale = useAdminLocale();
  const toast = useToast();
  const { items, move, apply, announcement } = useOrderedList(banners, {
    keyOf: idOf,
    label: (banner) => `«${banner.title.uz}»`,
    send: (ids) => runAction((csrf) => reorderBanners(ids, csrf)),
    onError: (message) =>
      toast({ tone: "danger", title: copy.toast.orderFailed, description: message }),
    merge: keepPreviews,
  });
  const { rowProps } = useRowDrag(move);
  const filter = useListFilter<Banner>(
    (banner) => [banner.title.uz, banner.title.ru, banner.title.en],
    (banner) => banner.isActive,
  );
  const shown = items.filter(filter.matches).length;
  const [dialog, setDialog] = useState<DialogState>(null);
  // Mounts a fresh dialog (and form) for every opening.
  const [instance, setInstance] = useState(0);
  const idempotency = useIdempotencyKey();
  const [deleting, setDeleting] = useState<Banner | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const deleteInFlight = useRef(false);
  const addButton = useRef<HTMLButtonElement>(null);
  const deleted = useRef(false);
  const nowDate = new Date(now);

  const openDialog = (state: Exclude<DialogState, null>) => {
    setInstance((current) => current + 1);
    setDialog(state);
  };

  const onSaved = (banner: Banner, mode: "create" | "edit", previewUrl: string | null) => {
    const saved = banner.imageUrl
      ? banner
      : {
          ...banner,
          imageUrl: previewUrl ?? items.find((item) => item.id === banner.id)?.imageUrl ?? "",
        };
    apply((rows) => upsertRow(rows, saved, idOf));
    toast({
      tone: "success",
      title: mode === "create" ? copy.toast.created : copy.toast.saved,
      description: saved.title.uz,
    });
  };

  const confirmDelete = async () => {
    // Synchronous guard: a double click must not send a second DELETE.
    if (!deleting || deleteInFlight.current) return;
    deleteInFlight.current = true;
    setDeleteBusy(true);
    setDeleteError(null);
    const result = await runAction((csrf) => deleteBanner(deleting.id, csrf));
    deleteInFlight.current = false;
    setDeleteBusy(false);
    if (!result.ok) {
      setDeleteError(result.error);
      toast({ tone: "danger", title: copy.toast.failed, description: result.error });
      return;
    }
    deleted.current = true;
    const id = deleting.id;
    apply((rows) => rows.filter((item) => item.id !== id));
    setDeleting(null);
    toast({ tone: "success", title: copy.toast.deleted, description: deleting.title.uz });
  };

  const linkText = (banner: Banner) =>
    bannerLinkText(banner.link, locale, (slug) => categoryLabel(categories, slug));

  return (
    <>
      <PageHeader
        eyebrow={t.eyebrow(fmt.number(items.length))}
        title={t.title}
        actions={
          <>
            <ExportMenu href={exportHref} label={t.export} />
            <button
              type="button"
              ref={addButton}
              onClick={() => openDialog({ mode: "create" })}
              className={buttonStyles()}
            >
              <Icon name="plus" size={18} />
              {t.add}
            </button>
          </>
        }
      />

      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <section
        aria-label={t.region}
        className="overflow-hidden rounded-lg bg-surface-raised shadow-sm"
      >
        {items.length > 0 && <ListFilterBar label={t.filter} filter={filter} />}
        {items.length > 0 ? (
          <ScrollRegion label={t.table}>
            <table className="data-table min-w-[900px]">
              <thead>
                <tr>
                  <th scope="col">{t.order}</th>
                  <th scope="col">{t.image}</th>
                  <th scope="col">{t.heading}</th>
                  <th scope="col">{t.link}</th>
                  <th scope="col">{t.window}</th>
                  <th scope="col">{t.status}</th>
                  <th scope="col">
                    <span className="sr-only">{t.actions}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((banner, index) => {
                  if (!filter.matches(banner)) return null;
                  const schedule = bannerScheduleState(banner, nowDate);
                  return (
                    <tr key={banner.id} {...(filter.filtered ? {} : rowProps(index))}>
                      <td>
                        <span className="inline-flex items-center gap-1">
                          <Icon name="grip" size={16} className="text-ink-muted" />
                          {filter.filtered ? (
                            <span className="w-6 text-right text-body-sm text-ink-muted tabular-nums">
                              {index + 1}
                            </span>
                          ) : (
                            <ReorderButtons
                              subject={banner.title.uz}
                              index={index}
                              count={items.length}
                              onMove={move}
                            />
                          )}
                        </span>
                      </td>
                      <td>
                        <BannerThumb src={banner.imageUrl} alt="" />
                      </td>
                      <td>
                        <span className="flex max-w-[300px] min-w-0 flex-col">
                          <span lang="uz" className="font-bold break-words text-ink">
                            {banner.title.uz}
                          </span>
                          <span className="truncate text-[12px] text-ink-muted">
                            {[banner.title.ru, banner.title.en].filter(Boolean).join(" · ") ||
                              t.noTranslations}
                          </span>
                        </span>
                      </td>
                      <td>
                        <span
                          className="inline-block max-w-[260px] truncate align-bottom"
                          title={
                            banner.link.kind === "url" ? (banner.link.url ?? undefined) : undefined
                          }
                        >
                          {linkText(banner)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap tabular-nums">
                        {windowLabel(banner, t, fmt)}
                      </td>
                      <td>
                        <span className="flex flex-col items-start gap-1">
                          <Badge tone={banner.isActive ? "success" : "neutral"}>
                            {banner.isActive ? t.active : t.inactive}
                          </Badge>
                          {banner.isActive && (
                            <Badge tone={SCHEDULE_TONE[schedule]} dot={false}>
                              {t.schedule[schedule]}
                            </Badge>
                          )}
                        </span>
                      </td>
                      <td>
                        <span className="flex justify-end gap-0.5">
                          <IconButton
                            size="sm"
                            aria-label={t.edit(banner.title.uz)}
                            onClick={() => openDialog({ mode: "edit", banner })}
                          >
                            <Icon name="pencil" size={18} />
                          </IconButton>
                          <IconButton
                            size="sm"
                            aria-label={t.remove(banner.title.uz)}
                            onClick={() => {
                              setDeleteError(null);
                              setDeleting(banner);
                            }}
                            className="hover:text-danger"
                          >
                            <Icon name="trash" size={18} />
                          </IconButton>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {shown === 0 && (
              <p className="m-0 px-6 py-10 text-center text-body-sm text-ink-muted">
                {t.nothingFound}
              </p>
            )}
          </ScrollRegion>
        ) : (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-gold-soft text-gold-ink">
              <Icon name="image" size={22} />
            </span>
            <p className="m-0 text-subheading text-ink">{t.emptyTitle}</p>
            <p className="m-0 max-w-[420px] text-body-sm text-ink-muted">{t.emptyLead}</p>
            <Button variant="secondary" onClick={() => openDialog({ mode: "create" })}>
              <Icon name="plus" size={18} />
              {t.add}
            </Button>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3 text-caption font-normal text-ink-muted">
          <Icon name="info" size={14} className="shrink-0" />
          <span className="min-w-0 flex-1">{t.footer}</span>
        </div>
      </section>

      <BannerDialog
        key={instance}
        idempotency={idempotency}
        open={dialog !== null}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
        banner={dialog?.mode === "edit" ? dialog.banner : null}
        categories={categories}
        scenes={scenes}
        onSaved={onSaved}
      />

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (deleteBusy) return;
          if (!open) setDeleting(null);
        }}
        onCloseAutoFocus={(event) => {
          if (deleted.current) {
            event.preventDefault();
            deleted.current = false;
            addButton.current?.focus();
          }
        }}
        title={deleting ? copy.remove.title(deleting.title.uz) : ""}
        description={<p className="m-0 text-[14px] leading-5 text-ink">{copy.remove.lead}</p>}
      >
        {deleteError && (
          <p
            role="alert"
            className="m-0 flex items-start gap-1.5 text-body-sm font-semibold text-ink"
          >
            <Icon name="alert-circle" size={16} className="mt-px shrink-0 text-danger" />
            {deleteError}
          </p>
        )}
        <div className="mt-1.5 flex flex-wrap justify-end gap-2">
          <AlertDialogCancel asChild>
            <Button variant="outline" disabledReason={deleteBusy && copy.remove.cancelBusy}>
              {copy.remove.cancel}
            </Button>
          </AlertDialogCancel>
          <Button variant="destructive" onClick={confirmDelete} busy={deleteBusy}>
            {deleteBusy ? copy.remove.busy : copy.remove.confirm}
          </Button>
        </div>
      </AlertDialog>
    </>
  );
}
