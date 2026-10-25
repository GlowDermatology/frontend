"use client";

import Image from "next/image";
import { useRef, useState } from "react";

import { Badge, type Tone } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { AlertDialog, AlertDialogCancel } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { ScrollRegion } from "@/components/ui/scroll-region";
import { useToast } from "@/components/ui/toast";
import { deleteBanner, reorderBanners } from "@/data/banners.actions";
import {
  BANNER_LINK_LABEL,
  bannerScheduleState,
  type Banner,
  type BannerScheduleState,
} from "@/domain/banner";
import { categoryLabel, type Category } from "@/domain/category";
import { formatDateTimeShort, formatNumber } from "@/lib/format";

import { runAction } from "../shared/action-client";
import { ExportMenu } from "../shared/export-menu";
import { useIdempotencyKey } from "../shared/idempotency";
import { PageHeader } from "../shared/page-header";
import { ReorderButtons } from "../shared/reorder-buttons";
import { upsertRow, useOrderedList } from "../shared/use-ordered-list";
import { BannerDialog } from "./banner-dialog";

interface BannersViewProps {
  banners: Banner[];
  categories: ReadonlyArray<Category>;
  /** The server's now (ISO), for the schedule state; never `new Date()` here. */
  now: string;
  exportHref: string;
}

type DialogState = { mode: "create" } | { mode: "edit"; banner: Banner } | null;

const SCHEDULE_META: Record<BannerScheduleState, { label: string; tone: Tone }> = {
  live: { label: "Ko‘rsatilmoqda", tone: "success" },
  scheduled: { label: "Rejalashtirilgan", tone: "warning" },
  ended: { label: "Tugagan", tone: "neutral" },
  inactive: { label: "Faol emas", tone: "neutral" },
};

const iconButtonClass =
  "flex size-9 items-center justify-center rounded-md text-ink-muted transition-colors duration-150 hover:bg-gold-soft hover:text-ink";

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

function windowLabel(banner: Banner): string {
  if (!banner.startsAt && !banner.endsAt) return "Doimiy";
  const from = banner.startsAt ? formatDateTimeShort(banner.startsAt) : "…";
  const to = banner.endsAt ? formatDateTimeShort(banner.endsAt) : "…";
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
export function BannersView({ banners, categories, now, exportHref }: BannersViewProps) {
  const toast = useToast();
  const { items, move, apply, announcement } = useOrderedList(banners, {
    keyOf: idOf,
    label: (banner) => `«${banner.title.uz}»`,
    send: (ids) => runAction((csrf) => reorderBanners(ids, csrf)),
    onError: (message) => toast({ tone: "info", title: "Amal bajarilmadi", description: message }),
    merge: keepPreviews,
  });
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
      title: mode === "create" ? "Banner qo‘shildi" : "Banner saqlandi",
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
      return;
    }
    deleted.current = true;
    const id = deleting.id;
    apply((rows) => rows.filter((item) => item.id !== id));
    setDeleting(null);
    toast({ title: "Banner o‘chirildi", description: deleting.title.uz });
  };

  const linkText = (banner: Banner) => {
    if (banner.link.kind === "product") return `Mahsulot #${banner.link.productId}`;
    if (banner.link.kind === "category") {
      return `Kategoriya: ${categoryLabel(categories, banner.link.category ?? "")}`;
    }
    return BANNER_LINK_LABEL.none;
  };

  return (
    <>
      <PageHeader
        eyebrow={`${formatNumber(items.length)} ta banner`}
        title="Bannerlar"
        actions={
          <>
            <ExportMenu href={exportHref} />
            <button
              type="button"
              ref={addButton}
              onClick={() => openDialog({ mode: "create" })}
              className={buttonStyles()}
            >
              <Icon name="plus" size={18} />
              Banner qo‘shish
            </button>
          </>
        }
      />

      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <section
        aria-label="Bannerlar ro‘yxati"
        className="overflow-hidden rounded-lg bg-surface-raised shadow-sm"
      >
        {items.length > 0 ? (
          <ScrollRegion label="Bannerlar jadvali">
            <table className="data-table min-w-[900px]">
              <thead>
                <tr>
                  <th scope="col">TARTIB</th>
                  <th scope="col">RASM</th>
                  <th scope="col">SARLAVHA</th>
                  <th scope="col">HAVOLA</th>
                  <th scope="col">MUDDAT</th>
                  <th scope="col">HOLAT</th>
                  <th scope="col">
                    <span className="sr-only">Amallar</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((banner, index) => {
                  const state = SCHEDULE_META[bannerScheduleState(banner, nowDate)];
                  return (
                    <tr key={banner.id}>
                      <td>
                        <ReorderButtons
                          subject={`«${banner.title.uz}»`}
                          index={index}
                          count={items.length}
                          onMove={move}
                        />
                      </td>
                      <td>
                        <BannerThumb src={banner.imageUrl} alt="" />
                      </td>
                      <td>
                        <span className="flex flex-col">
                          <span className="font-bold text-ink">{banner.title.uz}</span>
                          <span className="text-[12px] text-ink-muted">
                            {[banner.title.ru, banner.title.en].filter(Boolean).join(" · ") ||
                              "Tarjimalar to‘ldirilmagan"}
                          </span>
                        </span>
                      </td>
                      <td>{linkText(banner)}</td>
                      <td className="tabular-nums">{windowLabel(banner)}</td>
                      <td>
                        <span className="flex flex-col items-start gap-1">
                          <Badge tone={banner.isActive ? "success" : "neutral"}>
                            {banner.isActive ? "Faol" : "Faol emas"}
                          </Badge>
                          {banner.isActive && (
                            <Badge tone={state.tone} dot={false}>
                              {state.label}
                            </Badge>
                          )}
                        </span>
                      </td>
                      <td>
                        <span className="flex justify-end gap-0.5">
                          <button
                            type="button"
                            aria-label={`«${banner.title.uz}» — tahrirlash`}
                            onClick={() => openDialog({ mode: "edit", banner })}
                            className={iconButtonClass}
                          >
                            <Icon name="pencil" size={18} />
                          </button>
                          <button
                            type="button"
                            aria-label={`«${banner.title.uz}» — o‘chirish`}
                            onClick={() => {
                              setDeleteError(null);
                              setDeleting(banner);
                            }}
                            className={`${iconButtonClass} hover:text-danger`}
                          >
                            <Icon name="trash" size={18} />
                          </button>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </ScrollRegion>
        ) : (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-gold-soft text-gold-ink">
              <Icon name="image" size={22} />
            </span>
            <p className="m-0 text-subheading text-ink">Hali banner yo‘q</p>
            <p className="m-0 max-w-[420px] text-body-sm text-ink-muted">
              Ilova bosh sahifasida aksiya yoki yangilikni ko‘rsatish uchun banner qo‘shing. Rasm
              2:1 nisbatda yaxshi ko‘rinadi.
            </p>
            <Button variant="secondary" onClick={() => openDialog({ mode: "create" })}>
              <Icon name="plus" size={18} />
              Banner qo‘shish
            </Button>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3 text-caption font-normal text-ink-muted">
          <Icon name="info" size={14} />
          Tartib ilovadagi ketma-ketlikni belgilaydi. Muddat Toshkent vaqti bo‘yicha.
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
        title={deleting ? `«${deleting.title.uz}» bannerini o‘chirasizmi?` : ""}
        description={
          <p className="m-0 text-[14px] leading-5 text-ink">
            Banner ilovadan darhol yo‘qoladi. Bu amalni qaytarib bo‘lmaydi.
          </p>
        }
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
          <AlertDialogCancel disabled={deleteBusy} className={buttonStyles({ variant: "outline" })}>
            Bekor qilish
          </AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={confirmDelete}
            disabled={deleteBusy}
            aria-busy={deleteBusy}
          >
            {deleteBusy ? "O‘chirilmoqda…" : "O‘chirish"}
          </Button>
        </div>
      </AlertDialog>
    </>
  );
}
