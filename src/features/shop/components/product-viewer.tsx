"use client";

import Image from "next/image";
import { Dialog as DialogPrimitive } from "radix-ui";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from "react";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

export interface ViewerPhoto {
  /** The whole original photo (not a card's crop). */
  src: string;
  alt: string;
  thumb: string | null;
}

/** Plain strings: the copy crosses from the server page to this client component. */
export interface ViewerCopy {
  title: string;
  close: string;
  previous: string;
  next: string;
  zoomIn: string;
  zoomOut: string;
  /** What a click on the photo does, under it (and once zoomed). */
  hint: string;
  hintZoomed: string;
  /** «Image 2 of 5» per photo, for the thumbnails. */
  imageLabels: string[];
}

const OpenViewer = createContext<((index: number) => void) | null>(null);

/** A swipe shorter than this (px) is a tap. */
const SWIPE = 48;
const ZOOM = 2.2;

/**
 * The product page's full-screen photo viewer: the whole original photo on a dark stage, a
 * slider (arrows, swipe, ← →, thumbnails), a click (or the zoom button) to look closer, the
 * pointer moving the zoomed view. Opened by a {@link ViewerTrigger} on each gallery slide; Esc,
 * the close button or a tap outside the photo closes it, and focus goes back to the slide.
 */
export function ProductViewer({
  photos,
  copy,
  children,
}: {
  photos: ReadonlyArray<ViewerPhoto>;
  copy: ViewerCopy;
  children: ReactNode;
}) {
  const [index, setIndex] = useState<number | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");
  const start = useRef<{ x: number; y: number } | null>(null);
  /** What opened the viewer: focus goes back there when it closes (Esc, ×, a tap outside). */
  const opener = useRef<HTMLElement | null>(null);
  const count = photos.length;

  const go = useCallback(
    (step: number) => {
      setZoomed(false);
      setIndex((current) => (current === null ? current : (current + step + count) % count));
    },
    [count],
  );

  useEffect(() => {
    if (index === null || count < 2) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") go(-1);
      if (event.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, count, go]);

  const open = useCallback((at: number) => {
    setZoomed(false);
    setIndex((current) => {
      if (current === null && document.activeElement instanceof HTMLElement) {
        opener.current = document.activeElement;
      }
      return at;
    });
  }, []);

  const aim = (event: PointerEvent<HTMLElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - box.left) / box.width) * 100;
    const y = ((event.clientY - box.top) / box.height) * 100;
    setOrigin(`${Math.min(100, Math.max(0, x))}% ${Math.min(100, Math.max(0, y))}%`);
  };

  const photo = index === null ? null : photos[index];

  return (
    <OpenViewer.Provider value={open}>
      {children}
      <DialogPrimitive.Root
        open={index !== null}
        onOpenChange={(next) => {
          if (!next) setIndex(null);
        }}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[rgb(14_12_11)] data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in" />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            onCloseAutoFocus={(event) => {
              if (opener.current?.isConnected) {
                event.preventDefault();
                opener.current.focus();
              }
              opener.current = null;
            }}
            data-product-viewer=""
            className="fixed inset-0 z-50 flex flex-col text-white focus-visible:outline-none data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in"
          >
            <DialogPrimitive.Title className="sr-only">{copy.title}</DialogPrimitive.Title>
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="text-body-sm font-semibold tabular-nums" aria-live="polite">
                {index === null ? "" : `${index + 1} / ${count}`}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setZoomed((value) => !value)}
                  aria-pressed={zoomed}
                  data-viewer-zoom=""
                  className={cn(
                    viewerPill,
                    zoomed && "bg-white text-[rgb(14_12_11)] hover:bg-white/90",
                  )}
                >
                  <Icon name={zoomed ? "zoom-out" : "zoom-in"} size={18} />
                  {zoomed ? copy.zoomOut : copy.zoomIn}
                </button>
                <DialogPrimitive.Close
                  aria-label={copy.close}
                  title={copy.close}
                  className={viewerButton}
                >
                  <Icon name="close" size={22} />
                </DialogPrimitive.Close>
              </div>
            </div>
            <div className="relative min-h-0 flex-1 overflow-hidden">
              {photo ? (
                <div
                  key={photo.src}
                  data-viewer-stage=""
                  className={cn(
                    "absolute inset-0 touch-none select-none",
                    zoomed ? "cursor-zoom-out" : "cursor-zoom-in",
                  )}
                  onPointerDown={(event) => {
                    start.current = { x: event.clientX, y: event.clientY };
                    if (zoomed) aim(event);
                  }}
                  onPointerMove={(event) => {
                    if (zoomed && (event.pointerType === "mouse" || start.current)) aim(event);
                  }}
                  onPointerUp={(event) => {
                    const from = start.current;
                    start.current = null;
                    if (!from) return;
                    const dx = event.clientX - from.x;
                    const dy = event.clientY - from.y;
                    if (
                      !zoomed &&
                      count > 1 &&
                      Math.abs(dx) > SWIPE &&
                      Math.abs(dx) > Math.abs(dy)
                    ) {
                      go(dx < 0 ? 1 : -1);
                      return;
                    }
                    if (Math.abs(dx) < 8 && Math.abs(dy) < 8) {
                      aim(event);
                      setZoomed((value) => !value);
                    }
                  }}
                  onPointerCancel={() => {
                    start.current = null;
                  }}
                >
                  <Image
                    src={photo.src}
                    alt={photo.alt}
                    fill
                    sizes="100vw"
                    priority
                    draggable={false}
                    className="object-contain transition-transform duration-200 ease-out"
                    style={{
                      transform: zoomed ? `scale(${ZOOM})` : undefined,
                      transformOrigin: origin,
                    }}
                  />
                </div>
              ) : null}
              {count > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={() => go(-1)}
                    aria-label={copy.previous}
                    title={copy.previous}
                    className={cn(viewerButton, "absolute top-1/2 left-3 -translate-y-1/2")}
                  >
                    <Icon name="chevron-left" size={24} />
                  </button>
                  <button
                    type="button"
                    onClick={() => go(1)}
                    aria-label={copy.next}
                    title={copy.next}
                    className={cn(viewerButton, "absolute top-1/2 right-3 -translate-y-1/2")}
                  >
                    <Icon name="chevron-right" size={24} />
                  </button>
                </>
              ) : null}
            </div>
            <p className="m-0 px-4 pt-3 text-center text-body-sm text-white/70" data-viewer-hint="">
              {zoomed ? copy.hintZoomed : copy.hint}
            </p>
            {count > 1 ? (
              <ul className="m-0 flex list-none justify-center gap-2 overflow-x-auto px-4 py-3">
                {photos.map((item, at) => (
                  <li key={item.src}>
                    <button
                      type="button"
                      onClick={() => open(at)}
                      aria-label={copy.imageLabels[at]}
                      aria-current={at === index ? "true" : undefined}
                      className={cn(
                        "relative block size-14 overflow-hidden rounded-md border-2 transition-[border-color,opacity] duration-150",
                        at === index
                          ? "border-gold opacity-100"
                          : "border-transparent opacity-60 hover:opacity-100",
                      )}
                    >
                      <Image
                        src={item.thumb ?? item.src}
                        alt=""
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </OpenViewer.Provider>
  );
}

const viewerPill =
  "inline-flex h-11 items-center gap-2 rounded-full bg-white/10 px-4 text-body-sm font-semibold text-white backdrop-blur-sm transition-colors duration-150 hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold";

const viewerButton =
  "flex size-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors duration-150 hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold";

/**
 * A gallery slide's way into the viewer: the whole photo is the button (a click or tap opens
 * it there), with a magnifier chip in the corner so it is visible that it can be opened.
 */
export function ViewerTrigger({
  index,
  label,
  text,
}: {
  index: number;
  /** The accessible name: starts with the visible word («Kattalashtirish: 1 / 3 rasm»). */
  label: string;
  /** The pill's visible word («Kattalashtirish»). */
  text: string;
}) {
  const open = useContext(OpenViewer);
  if (!open) return null;
  return (
    <button
      type="button"
      onClick={() => open(index)}
      aria-label={label}
      data-viewer-trigger={index}
      className="group/zoom absolute inset-0 z-[1] cursor-zoom-in rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-ink"
    >
      <span
        aria-hidden="true"
        className="absolute top-3 right-3 inline-flex h-10 items-center gap-1.5 rounded-full bg-surface-raised/90 px-3.5 text-body-sm font-semibold text-ink shadow-sm backdrop-blur-sm transition-transform duration-150 group-hover/zoom:scale-105"
      >
        <Icon name="zoom-in" size={18} />
        {text}
      </span>
    </button>
  );
}
