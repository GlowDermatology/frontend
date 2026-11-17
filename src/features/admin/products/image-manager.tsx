"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState, type ChangeEvent, type DragEvent } from "react";

import { ProductArt } from "@/components/brand/product-art";
import { Icon } from "@/components/ui/icon";
import { ActionMenu } from "@/components/ui/menu";
import { isDefaultImageLabel, type ProductImage } from "@/domain/product";
import { imageFileProblem, IMAGE_TYPES, MAX_IMAGES } from "@/data/products.schema";
import { cn } from "@/lib/cn";
import { useAdminLocale, useCopy } from "@/lib/i18n/admin-context";

import { productsCopy } from "./copy";

interface ImageManagerProps {
  images: ReadonlyArray<ProductImage>;
  onMove: (from: number, to: number) => void;
  onRemove: (index: number) => void;
  /**
   * New tiles with their files, keyed by the temporary `upload-…` id. The
   * editor keeps the files until it uploads them on save.
   */
  onAdd: (images: ProductImage[], files: ReadonlyMap<string, File>) => void;
  /** The form's error for the images (e.g. an active product without one). */
  error?: string;
  /** Accessible name of the card's group (the card title's id). */
  labelledBy?: string;
}

const tileButton =
  "flex size-8 items-center justify-center rounded-sm bg-surface-raised transition-colors duration-150 hover:bg-gold-soft";

/**
 * Product images: the first one is the main image. Order changes by dragging
 * a tile (mouse) or from each tile's "tartib" menu (keyboard, touch and a
 * single-pointer alternative to dragging, WCAG 2.5.7). Uploads are previewed
 * locally with object URLs; the files themselves go to the server when the
 * form is saved (`uploadProductImage`, one call per file).
 *
 * The root is the field the error reveal lands on (`data-field="images"`, `data-invalid` while the
 * form refuses the images, focusable with `tabIndex={-1}`), so a save that fails on the images
 * scrolls here, focuses and marks the card instead of failing out of sight.
 */
export function ImageManager({
  images,
  onMove,
  onRemove,
  onAdd,
  error,
  labelledBy,
}: ImageManagerProps) {
  const t = useCopy(productsCopy).imageManager;
  const locale = useAdminLocale();
  const errorId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const createdUrls = useRef(new Set<string>());
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);

  useEffect(() => {
    const urls = createdUrls.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  // An API photo has no name (the mapper's «Rasm N» token): it is shown by its current place.
  const labelOf = (image: ProductImage | undefined, index: number) =>
    image?.label && !isDefaultImageLabel(image.label) ? image.label : t.alt(index + 1);

  const move = (from: number, to: number) => {
    if (from === to || to < 0 || to >= images.length) return;
    const label = labelOf(images[from], from);
    onMove(from, to);
    setAnnouncement(t.moved(label, to + 1, to === 0));
  };

  const remove = (index: number) => {
    const image = images[index];
    const label = labelOf(image, index);
    if (image?.src && createdUrls.current.has(image.src)) {
      URL.revokeObjectURL(image.src);
      createdUrls.current.delete(image.src);
    }
    onRemove(index);
    setAnnouncement(t.removed(label));
    // Keep focus in the grid: the tile that took this place, or the upload button.
    requestAnimationFrame(() => {
      listRef.current?.children[index]?.querySelector("button")?.focus();
    });
  };

  const onFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    const errors: string[] = [];
    const added: ProductImage[] = [];
    const addedFiles = new Map<string, File>();
    for (const file of files) {
      if (images.length + added.length >= MAX_IMAGES) {
        errors.push(t.tooMany(MAX_IMAGES));
        break;
      }
      // Type, then 5 MiB, checked here so an oversized file never makes the
      // round trip (the Server Action body limit is 6 MB).
      const problem = imageFileProblem(file, locale);
      if (problem) {
        errors.push(t.fileProblem(file.name, problem));
        continue;
      }
      const src = URL.createObjectURL(file);
      createdUrls.current.add(src);
      const id = `upload-${crypto.randomUUID()}`;
      added.push({ id, label: file.name, src });
      addedFiles.set(id, file);
    }
    setUploadErrors(errors);
    if (added.length > 0) {
      onAdd(added, addedFiles);
      setAnnouncement(t.added(added.length));
    }
  };

  const dragProps = (index: number) => ({
    draggable: true,
    onDragStart: (event: DragEvent) => {
      setDragIndex(index);
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", String(index));
    },
    onDragOver: (event: DragEvent) => {
      if (dragIndex === null) return;
      event.preventDefault();
      setOverIndex(index);
    },
    onDragLeave: () => setOverIndex((current) => (current === index ? null : current)),
    onDrop: (event: DragEvent) => {
      event.preventDefault();
      if (dragIndex !== null) move(dragIndex, index);
      setDragIndex(null);
      setOverIndex(null);
    },
    onDragEnd: () => {
      setDragIndex(null);
      setOverIndex(null);
    },
  });

  const messages = [...(error ? [error] : []), ...uploadErrors];

  return (
    <div
      role="group"
      aria-labelledby={labelledBy}
      aria-describedby={messages.length > 0 ? errorId : undefined}
      data-field="images"
      data-invalid={error ? "true" : undefined}
      tabIndex={-1}
      className={cn(
        "-m-2 flex flex-col gap-3 rounded-lg p-2 transition-[box-shadow] duration-150 outline-none",
        error && "ring-[1.5px] ring-danger/60",
      )}
    >
      <ul
        ref={listRef}
        className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3 p-0"
      >
        {images.map((image, index) => {
          const main = index === 0;
          const label = labelOf(image, index);
          return (
            <li
              key={image.id}
              {...dragProps(index)}
              className={cn(
                "relative flex aspect-square items-center justify-center overflow-hidden rounded-md transition-[opacity,outline-color] duration-150",
                main ? "border-2 border-gold" : "border border-line",
                image.src ? "bg-surface" : image.art?.kind === "box" ? "bg-white" : "bg-gold-soft",
                dragIndex === index && "opacity-50",
                overIndex === index &&
                  dragIndex !== index &&
                  "outline-2 outline-offset-2 outline-gold-ink outline-dashed",
              )}
            >
              {image.src?.startsWith("blob:") ? (
                // Local preview of an unsaved upload (object URL); next/image cannot optimise blobs.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image.src} alt={label} className="size-full object-cover" />
              ) : image.src ? (
                <Image
                  src={image.src}
                  alt={label}
                  fill
                  sizes="(min-width: 640px) 160px, 45vw"
                  className="object-cover"
                />
              ) : image.art ? (
                <ProductArt
                  kind={image.art.kind}
                  tone={image.art.tone}
                  detail="thumb"
                  width={image.art.kind === "texture" ? 80 : 66}
                  label={label}
                />
              ) : null}
              {main && (
                <span className="absolute top-2 left-2 h-[22px] rounded-sm bg-gold px-2 text-[10px] leading-[22px] font-bold tracking-[0.06em] text-on-gold">
                  {t.main}
                </span>
              )}
              <span className="absolute top-1.5 right-1.5 flex gap-0.5">
                <ActionMenu
                  label={t.order(label)}
                  triggerClassName={cn(tileButton, "cursor-grab text-ink-muted")}
                  trigger={
                    <>
                      <Icon name="grip" size={16} />
                      <span className="sr-only">{t.orderTrigger(label, index + 1)}</span>
                    </>
                  }
                  items={[
                    {
                      key: "main",
                      label: t.makeMain,
                      disabledReason: main ? t.alreadyMain : null,
                      onSelect: () => move(index, 0),
                    },
                    {
                      key: "earlier",
                      label: t.earlier,
                      disabledReason: main ? t.alreadyFirst : null,
                      onSelect: () => move(index, index - 1),
                    },
                    {
                      key: "later",
                      label: t.later,
                      disabledReason: index === images.length - 1 ? t.alreadyLast : null,
                      onSelect: () => move(index, index + 1),
                    },
                  ]}
                />
                <button
                  type="button"
                  onClick={() => remove(index)}
                  aria-label={t.remove(label)}
                  className={cn(tileButton, "text-danger")}
                >
                  <Icon name="trash" size={16} />
                </button>
              </span>
            </li>
          );
        })}
        {images.length < MAX_IMAGES && (
          <li className="flex aspect-square">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex size-full flex-col items-center justify-center gap-2 rounded-md border-[1.5px] border-dashed border-line-strong p-3 text-center text-[13px] leading-[18px] font-semibold text-ink transition-colors duration-150 hover:bg-surface"
            >
              <Icon name="upload" size={24} className="text-gold-ink" />
              {t.upload}
              <span className="text-[11px] leading-[14px] font-medium text-ink-muted">
                {t.uploadHint}
              </span>
              <span className="text-[11px] leading-[14px] font-semibold text-ink-muted tabular-nums">
                {t.countHint(images.length, MAX_IMAGES)}
              </span>
            </button>
            <input
              ref={inputRef}
              type="file"
              accept={IMAGE_TYPES.join(",")}
              multiple
              tabIndex={-1}
              aria-hidden="true"
              className="sr-only"
              onChange={onFiles}
            />
          </li>
        )}
      </ul>
      {messages.length > 0 && (
        <div id={errorId} role="alert" className="flex flex-col gap-1">
          {messages.map((message) => (
            <p
              key={message}
              className="m-0 flex items-start gap-1.5 text-body-sm font-semibold text-ink"
            >
              <Icon name="alert-circle" size={16} className="mt-px shrink-0 text-danger" />
              {message}
            </p>
          ))}
        </div>
      )}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
