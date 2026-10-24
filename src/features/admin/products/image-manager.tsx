"use client";

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";

import { ProductArt } from "@/components/brand/product-art";
import { Icon } from "@/components/ui/icon";
import { ActionMenu } from "@/components/ui/menu";
import type { ProductImage } from "@/domain/product";
import { IMAGE_TYPES, MAX_IMAGE_BYTES, MAX_IMAGES } from "@/data/products.schema";
import { cn } from "@/lib/cn";

interface ImageManagerProps {
  images: ReadonlyArray<ProductImage>;
  onMove: (from: number, to: number) => void;
  onRemove: (index: number) => void;
  onAdd: (images: ProductImage[]) => void;
  error?: string;
}

const tileButton =
  "flex size-8 items-center justify-center rounded-sm bg-surface-raised transition-colors duration-150 hover:bg-gold-soft";

/**
 * Product images: the first one is the main image. Order changes by dragging
 * a tile (mouse) or from each tile's "tartib" menu (keyboard, touch and a
 * single-pointer alternative to dragging, WCAG 2.5.7). Uploads are previewed
 * locally with object URLs until the form is saved.
 */
export function ImageManager({ images, onMove, onRemove, onAdd, error }: ImageManagerProps) {
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

  const move = (from: number, to: number) => {
    if (from === to || to < 0 || to >= images.length) return;
    const image = images[from];
    onMove(from, to);
    setAnnouncement(
      `«${image?.label ?? "Rasm"}» ${to + 1}-o‘ringa ko‘chirildi${to === 0 ? ", endi asosiy rasm" : ""}.`,
    );
  };

  const remove = (index: number) => {
    const image = images[index];
    if (image?.src && createdUrls.current.has(image.src)) {
      URL.revokeObjectURL(image.src);
      createdUrls.current.delete(image.src);
    }
    onRemove(index);
    setAnnouncement(`«${image?.label ?? "Rasm"}» o‘chirildi.`);
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
    for (const file of files) {
      if (images.length + added.length >= MAX_IMAGES) {
        errors.push(`Ko‘pi bilan ${MAX_IMAGES} ta rasm qo‘shish mumkin.`);
        break;
      }
      if (!(IMAGE_TYPES as ReadonlyArray<string>).includes(file.type)) {
        errors.push(`«${file.name}»: faqat JPG, PNG yoki WebP.`);
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        errors.push(`«${file.name}» 5 MB dan katta.`);
        continue;
      }
      const src = URL.createObjectURL(file);
      createdUrls.current.add(src);
      added.push({ id: `upload-${crypto.randomUUID()}`, label: file.name, src });
    }
    setUploadErrors(errors);
    if (added.length > 0) {
      onAdd(added);
      setAnnouncement(`${added.length} ta rasm qo‘shildi. Saqlash tugmasini bosing.`);
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

  return (
    <div className="flex flex-col gap-3">
      <ul
        ref={listRef}
        className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3 p-0"
      >
        {images.map((image, index) => {
          const main = index === 0;
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
              {image.src ? (
                // Local preview of an unsaved upload (object URL); next/image cannot optimise blobs.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image.src} alt={image.label} className="size-full object-cover" />
              ) : image.art ? (
                <ProductArt
                  kind={image.art.kind}
                  tone={image.art.tone}
                  detail="thumb"
                  width={image.art.kind === "texture" ? 80 : 66}
                  label={image.label}
                />
              ) : null}
              {main && (
                <span className="absolute top-2 left-2 h-[22px] rounded-sm bg-gold px-2 text-[10px] leading-[22px] font-bold tracking-[0.06em] text-on-gold">
                  ASOSIY
                </span>
              )}
              <span className="absolute top-1.5 right-1.5 flex gap-0.5">
                <ActionMenu
                  label={`«${image.label}» tartibi`}
                  triggerClassName={cn(tileButton, "cursor-grab text-ink-muted")}
                  trigger={
                    <>
                      <Icon name="grip" size={16} />
                      <span className="sr-only">
                        «{image.label}», {index + 1}-rasm: tartibni o‘zgartirish
                      </span>
                    </>
                  }
                  items={[
                    {
                      key: "main",
                      label: "Asosiy qilish",
                      disabled: main,
                      onSelect: () => move(index, 0),
                    },
                    {
                      key: "earlier",
                      label: "Oldinga surish",
                      disabled: main,
                      onSelect: () => move(index, index - 1),
                    },
                    {
                      key: "later",
                      label: "Orqaga surish",
                      disabled: index === images.length - 1,
                      onSelect: () => move(index, index + 1),
                    },
                  ]}
                />
                <button
                  type="button"
                  onClick={() => remove(index)}
                  aria-label={`«${image.label}» rasmini o‘chirish`}
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
              Rasm yuklash
              <span className="text-[11px] leading-[14px] font-medium text-ink-muted">
                JPG, PNG, WebP · 5 MB gacha
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
      {(error || uploadErrors.length > 0) && (
        <div role="alert" className="flex flex-col gap-1">
          {[...(error ? [error] : []), ...uploadErrors].map((message) => (
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
