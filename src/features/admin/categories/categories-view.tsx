"use client";

import Image from "next/image";
import { useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles, IconButton } from "@/components/ui/button";
import { AlertDialog, AlertDialogCancel } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { ScrollRegion } from "@/components/ui/scroll-region";
import { useToast } from "@/components/ui/toast";
import { deleteCategory, reorderCategories } from "@/data/categories.actions";
import { canDeleteCategory, type Category } from "@/domain/category";
import { useCopy } from "@/lib/i18n/admin-context";
import { useFormat } from "@/lib/i18n/admin-hooks";

import { runAction } from "../shared/action-client";
import { ExportMenu } from "../shared/export-menu";
import { useIdempotencyKey } from "../shared/idempotency";
import { PageHeader } from "../shared/page-header";
import { ReorderButtons } from "../shared/reorder-buttons";
import { ListFilterBar, useListFilter } from "../shared/list-filter";
import { useRowDrag } from "../shared/row-drag";
import { upsertRow, useOrderedList } from "../shared/use-ordered-list";
import { CategoryDialog } from "./category-dialog";
import { categoriesCopy } from "./copy";

interface CategoriesViewProps {
  categories: Category[];
  exportHref: string;
}

type DialogState = { mode: "create" } | { mode: "edit"; category: Category } | null;

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
  const copy = useCopy(categoriesCopy);
  const t = copy.list;
  const fmt = useFormat();
  const toast = useToast();
  const { items, move, apply, announcement } = useOrderedList(categories, {
    keyOf: slugOf,
    label: (category) => `«${category.name.uz}»`,
    send: (slugs) => runAction((csrf) => reorderCategories(slugs, csrf)),
    onError: (message) =>
      toast({ tone: "danger", title: copy.toast.orderFailed, description: message }),
    // Keep a demo preview: mock uploads store no bytes, so the server rows
    // never carry the picked image.
    merge: (server, local) =>
      server.map((row) => {
        const preview = local.find((l) => l.slug === row.slug)?.imageUrl;
        return !row.imageUrl && preview?.startsWith("blob:") ? { ...row, imageUrl: preview } : row;
      }),
  });
  const { rowProps } = useRowDrag(move);
  const filter = useListFilter<Category>(
    (category) => [category.name.uz, category.name.ru, category.name.en, category.slug],
    (category) => category.isActive,
  );
  const shown = items.filter(filter.matches).length;
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
      tone: "success",
      title: mode === "create" ? copy.toast.created : copy.toast.saved,
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
      toast({ tone: "danger", title: copy.toast.failed, description: result.error });
      return;
    }
    deletedSlug.current = deleting.slug;
    const slug = deleting.slug;
    apply((rows) => rows.filter((item) => item.slug !== slug));
    setDeleting(null);
    toast({ tone: "success", title: copy.toast.deleted, description: deleting.name.uz });
  };

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
            <table className="data-table min-w-[820px]">
              <thead>
                <tr>
                  <th scope="col">{t.order}</th>
                  <th scope="col">
                    <span className="sr-only">{t.image}</span>
                  </th>
                  <th scope="col">{t.name}</th>
                  <th scope="col">{t.slug}</th>
                  <th scope="col" className="text-right!">
                    {t.products}
                  </th>
                  <th scope="col">{t.status}</th>
                  <th scope="col">
                    <span className="sr-only">{t.actions}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((category, index) =>
                  !filter.matches(category) ? null : (
                    <tr key={category.slug} {...(filter.filtered ? {} : rowProps(index))}>
                      <td>
                        <span className="inline-flex items-center gap-1">
                          <Icon name="grip" size={16} className="text-ink-muted" />
                          {filter.filtered ? (
                            <span className="w-6 text-right text-body-sm text-ink-muted tabular-nums">
                              {index + 1}
                            </span>
                          ) : (
                            <ReorderButtons
                              subject={category.name.uz}
                              index={index}
                              count={items.length}
                              onMove={move}
                            />
                          )}
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
                        <span className="flex max-w-[320px] min-w-0 flex-col">
                          <span lang="uz" className="font-bold break-words text-ink">
                            {category.name.uz}
                          </span>
                          <span className="truncate text-[12px] text-ink-muted">
                            {[category.name.ru, category.name.en].filter(Boolean).join(" · ") ||
                              t.noTranslations}
                          </span>
                        </span>
                      </td>
                      <td className="font-mono text-[12px] text-ink-muted">{category.slug}</td>
                      <td className="text-right tabular-nums">
                        {fmt.number(category.productCount)}
                      </td>
                      <td>
                        <Badge tone={category.isActive ? "success" : "neutral"}>
                          {category.isActive ? t.active : t.inactive}
                        </Badge>
                      </td>
                      <td>
                        <span className="flex justify-end gap-0.5">
                          <IconButton
                            size="sm"
                            aria-label={t.edit(category.name.uz)}
                            onClick={() => openDialog({ mode: "edit", category })}
                          >
                            <Icon name="pencil" size={18} />
                          </IconButton>
                          <IconButton
                            size="sm"
                            aria-label={t.remove(category.name.uz)}
                            disabledReason={
                              !canDeleteCategory(category) &&
                              t.removeBlocked(fmt.number(category.productCount))
                            }
                            onClick={() => {
                              setDeleteError(null);
                              setDeleting(category);
                            }}
                            className="hover:text-danger"
                          >
                            <Icon name="trash" size={18} />
                          </IconButton>
                        </span>
                      </td>
                    </tr>
                  ),
                )}
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
              <Icon name="tag" size={22} />
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
        title={deleting ? copy.remove.title(deleting.name.uz) : ""}
        description={
          deleting && deleting.productCount > 0 ? (
            <p className="m-0 text-[14px] leading-5 text-ink">
              {copy.remove.hasProducts(fmt.number(deleting.productCount))}
            </p>
          ) : (
            <p className="m-0 text-[14px] leading-5 text-ink">{copy.remove.lead}</p>
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
