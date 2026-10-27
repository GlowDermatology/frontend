"use client";

import Image from "next/image";
import { useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { AlertDialog, AlertDialogCancel } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { ScrollRegion } from "@/components/ui/scroll-region";
import { useToast } from "@/components/ui/toast";
import { deleteCategory, reorderCategories } from "@/data/categories.actions";
import type { Category } from "@/domain/category";
import { formatNumber } from "@/lib/format";

import { runAction } from "../shared/action-client";
import { ExportMenu } from "../shared/export-menu";
import { useIdempotencyKey } from "../shared/idempotency";
import { PageHeader } from "../shared/page-header";
import { ReorderButtons } from "../shared/reorder-buttons";
import { useRowDrag } from "../shared/row-drag";
import { upsertRow, useOrderedList } from "../shared/use-ordered-list";
import { CategoryDialog } from "./category-dialog";

interface CategoriesViewProps {
  categories: Category[];
  exportHref: string;
}

type DialogState = { mode: "create" } | { mode: "edit"; category: Category } | null;

const iconButtonClass =
  "flex size-9 items-center justify-center rounded-md text-ink-muted transition-colors duration-150 hover:bg-gold-soft hover:text-ink";

/**
 * Kategoriyalar: the ordered list with create/edit dialogs, delete
 * confirmation and up/down reordering (`PUT categories/order/` with the
 * exact set). The list is kept in local state and updated from each action's
 * answer, so the demo works without persistence and api mode shows the
 * server's row without waiting for the refresh; a newer server list (the
 * refresh, or a navigation back to the page) replaces it.
 */

const slugOf = (category: Category) => category.slug;
export function CategoriesView({ categories, exportHref }: CategoriesViewProps) {
  const toast = useToast();
  const { items, move, apply, announcement } = useOrderedList(categories, {
    keyOf: slugOf,
    label: (category) => `«${category.name.uz}»`,
    send: (slugs) => runAction((csrf) => reorderCategories(slugs, csrf)),
    onError: (message) => toast({ tone: "info", title: "Amal bajarilmadi", description: message }),
    // Keep a demo preview: mock uploads store no bytes, so the server rows
    // never carry the picked image.
    merge: (server, local) =>
      server.map((row) => {
        const preview = local.find((l) => l.slug === row.slug)?.imageUrl;
        return !row.imageUrl && preview?.startsWith("blob:") ? { ...row, imageUrl: preview } : row;
      }),
  });
  const { rowProps } = useRowDrag(move);
  const [dialog, setDialog] = useState<DialogState>(null);
  // Mounts a fresh dialog (and form) for every opening.
  const [instance, setInstance] = useState(0);
  const idempotency = useIdempotencyKey();
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const deleteInFlight = useRef(false);
  const addButton = useRef<HTMLButtonElement>(null);
  const deletedSlug = useRef<string | null>(null);

  const openDialog = (state: Exclude<DialogState, null>) => {
    setInstance((current) => current + 1);
    setDialog(state);
  };

  const onSaved = (category: Category, mode: "create" | "edit", previewUrl: string | null) => {
    // Demo mode keeps the local preview of a picked image (no bytes are stored).
    const row = category.imageUrl === "" ? { ...category, imageUrl: previewUrl } : category;
    apply((rows) => upsertRow(rows, row, slugOf));
    toast({
      title: mode === "create" ? "Kategoriya qo‘shildi" : "Kategoriya saqlandi",
      description: category.name.uz,
    });
  };

  const confirmDelete = async () => {
    // Synchronous guard: a double click must not send a second DELETE.
    if (!deleting || deleteInFlight.current) return;
    deleteInFlight.current = true;
    setDeleteBusy(true);
    setDeleteError(null);
    const result = await runAction((csrf) => deleteCategory(deleting.slug, csrf));
    deleteInFlight.current = false;
    setDeleteBusy(false);
    if (!result.ok) {
      setDeleteError(result.error);
      return;
    }
    deletedSlug.current = deleting.slug;
    const slug = deleting.slug;
    apply((rows) => rows.filter((item) => item.slug !== slug));
    setDeleting(null);
    toast({ title: "Kategoriya o‘chirildi", description: deleting.name.uz });
  };

  return (
    <>
      <PageHeader
        eyebrow={`${formatNumber(items.length)} ta kategoriya`}
        title="Kategoriyalar"
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
              Kategoriya qo‘shish
            </button>
          </>
        }
      />

      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <section
        aria-label="Kategoriyalar ro‘yxati"
        className="overflow-hidden rounded-lg bg-surface-raised shadow-sm"
      >
        {items.length > 0 ? (
          <ScrollRegion label="Kategoriyalar jadvali">
            <table className="data-table min-w-[820px]">
              <thead>
                <tr>
                  <th scope="col">TARTIB</th>
                  <th scope="col">
                    <span className="sr-only">Rasm</span>
                  </th>
                  <th scope="col">NOMI</th>
                  <th scope="col">SLUG</th>
                  <th scope="col" className="text-right!">
                    MAHSULOTLAR
                  </th>
                  <th scope="col">HOLAT</th>
                  <th scope="col">
                    <span className="sr-only">Amallar</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((category, index) => (
                  <tr key={category.slug} {...rowProps(index)}>
                    <td>
                      <span className="inline-flex items-center gap-1">
                        <Icon name="grip" size={16} className="text-ink-muted" />
                        <ReorderButtons
                          subject={`«${category.name.uz}»`}
                          index={index}
                          count={items.length}
                          onMove={move}
                        />
                      </span>
                    </td>
                    <td className="w-14">
                      <span className="relative flex size-10 items-center justify-center overflow-hidden rounded-md border border-line bg-surface text-ink-muted">
                        {category.imageUrl ? (
                          category.imageUrl.startsWith("blob:") ? (
                            // Demo preview of a picked image (object URL).
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={category.imageUrl}
                              alt=""
                              className="size-full object-cover"
                            />
                          ) : (
                            <Image
                              src={category.imageUrl}
                              alt=""
                              fill
                              sizes="40px"
                              className="object-cover"
                            />
                          )
                        ) : (
                          <Icon name="image" size={16} />
                        )}
                      </span>
                    </td>
                    <td>
                      <span className="flex flex-col">
                        <span className="font-bold text-ink">{category.name.uz}</span>
                        <span className="text-[12px] text-ink-muted">
                          {[category.name.ru, category.name.en].filter(Boolean).join(" · ") ||
                            "Tarjimalar to‘ldirilmagan"}
                        </span>
                      </span>
                    </td>
                    <td className="font-mono text-[12px] text-ink-muted">{category.slug}</td>
                    <td className="text-right tabular-nums">
                      {formatNumber(category.productCount)}
                    </td>
                    <td>
                      <Badge tone={category.isActive ? "success" : "neutral"}>
                        {category.isActive ? "Faol" : "Faol emas"}
                      </Badge>
                    </td>
                    <td>
                      <span className="flex justify-end gap-0.5">
                        <button
                          type="button"
                          aria-label={`«${category.name.uz}» — tahrirlash`}
                          onClick={() => openDialog({ mode: "edit", category })}
                          className={iconButtonClass}
                        >
                          <Icon name="pencil" size={18} />
                        </button>
                        <button
                          type="button"
                          aria-label={`«${category.name.uz}» — o‘chirish`}
                          onClick={() => {
                            setDeleteError(null);
                            setDeleting(category);
                          }}
                          className={`${iconButtonClass} hover:text-danger`}
                        >
                          <Icon name="trash" size={18} />
                        </button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollRegion>
        ) : (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-gold-soft text-gold-ink">
              <Icon name="tag" size={22} />
            </span>
            <p className="m-0 text-subheading text-ink">Hali kategoriya yo‘q</p>
            <p className="m-0 max-w-[420px] text-body-sm text-ink-muted">
              Mahsulotlarni guruhlash uchun birinchi kategoriyani qo‘shing. Tartib ilovadagi
              ko‘rinishni belgilaydi.
            </p>
            <Button variant="secondary" onClick={() => openDialog({ mode: "create" })}>
              <Icon name="plus" size={18} />
              Kategoriya qo‘shish
            </Button>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3 text-caption font-normal text-ink-muted">
          <Icon name="info" size={14} />
          Tartibni qatorni sudrab yoki strelkalar bilan o‘zgartiring; u ilovadagi ketma-ketlikni
          belgilaydi. Mahsulotli kategoriyani o‘chirib bo‘lmaydi.
        </div>
      </section>

      <CategoryDialog
        key={instance}
        idempotency={idempotency}
        open={dialog !== null}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
        category={dialog?.mode === "edit" ? dialog.category : null}
        onSaved={onSaved}
      />

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (deleteBusy) return;
          if (!open) setDeleting(null);
        }}
        onCloseAutoFocus={(event) => {
          // The row (and its trash button) is gone after a delete: focus the add button.
          if (deletedSlug.current) {
            event.preventDefault();
            deletedSlug.current = null;
            addButton.current?.focus();
          }
        }}
        title={deleting ? `«${deleting.name.uz}» kategoriyasini o‘chirasizmi?` : ""}
        description={
          deleting && deleting.productCount > 0 ? (
            <p className="m-0 text-[14px] leading-5 text-ink">
              Kategoriyada {formatNumber(deleting.productCount)} ta mahsulot bor. Avval ularni
              boshqa kategoriyaga o‘tkazing — aks holda server o‘chirishni rad etadi.
            </p>
          ) : (
            <p className="m-0 text-[14px] leading-5 text-ink">
              Kategoriya ilovadan va filtrlardan yo‘qoladi. Bu amalni qaytarib bo‘lmaydi.
            </p>
          )
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
