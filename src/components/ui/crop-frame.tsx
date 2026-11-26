"use client";

import Image from "next/image";
import {
  useEffect,
  useId,
  useRef,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

import {
  cropZoom,
  maxCropZoom,
  moveCrop,
  zoomCrop,
  type Crop,
  type ImageSize,
} from "@/domain/crop";
import { cn } from "@/lib/cn";

interface CropFrameProps {
  /** Width / height of the frame: the shape the crop keeps (0.8 for 4:5, 1 for a square). */
  ratio: number;
  /** Pixels of the photo the crop is normalised to. */
  size: ImageSize;
  crop: Crop;
  onChange: (crop: Crop) => void;
  /** The photo; without one `placeholder` is drawn in its place (an illustration). */
  src?: string | null;
  placeholder?: ReactNode;
  /** Accessible name of the frame, e.g. «4:5 kesim». */
  label: string;
  /** How to use it from the keyboard (read with the frame). */
  hint: string;
  /** Accessible name of the zoom slider. */
  zoomLabel: string;
  /** Spoken value of the zoom slider, e.g. `150%`. */
  zoomText?: (percent: number) => string;
  disabled?: boolean;
  /** Ids of messages about this crop (a server refusal), read with the frame. */
  describedBy?: string;
  invalid?: boolean;
  className?: string;
}

/** One arrow key press moves the crop this share of the photo (Shift: five times as far). */
const KEY_STEP = 0.01;
const ZOOM_STEP = 1.15;

/**
 * A fixed-ratio pan/zoom cropper: the frame has the crop's shape and shows the part of the photo
 * the crop keeps. Drag (mouse, pen, one finger) to move, wheel or pinch to zoom around the
 * pointer, the slider to zoom around the centre; from the keyboard the arrows move (Shift: further)
 * and + / − zoom. Every change goes through the pure helpers of `@/domain/crop`, so the crop is
 * always one the backend accepts. Controlled: `crop` in, `onChange` out; the current crop is
 * also on `data-crop` (for tests and the dialog's readout).
 */
export function CropFrame({
  ratio,
  size,
  crop,
  onChange,
  src,
  placeholder,
  label,
  hint,
  zoomLabel,
  zoomText = (percent) => `${percent}%`,
  disabled = false,
  describedBy,
  invalid = false,
  className,
}: CropFrameProps) {
  const hintId = useId();
  const frameRef = useRef<HTMLDivElement>(null);
  // The latest crop and handler, for events that fire faster than renders (drag, wheel, pinch).
  const latest = useRef({ crop, onChange, ratio, size, disabled });
  useEffect(() => {
    latest.current = { crop, onChange, ratio, size, disabled };
  });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; zoom: number } | null>(null);

  const emit = (next: Crop) => {
    latest.current = { ...latest.current, crop: next };
    latest.current.onChange(next);
  };

  /** A point of the frame (client px) as a point of the photo (0-1). */
  const photoPoint = (clientX: number, clientY: number): [number, number] => {
    const rect = frameRef.current!.getBoundingClientRect();
    const [x, y, w, h] = latest.current.crop;
    return [
      x + ((clientX - rect.left) / Math.max(1, rect.width)) * w,
      y + ((clientY - rect.top) / Math.max(1, rect.height)) * h,
    ];
  };

  // Wheel zoom needs a non-passive listener (React's `onWheel` cannot prevent the page scroll).
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const onWheel = (event: WheelEvent) => {
      const state = latest.current;
      if (state.disabled) return;
      event.preventDefault();
      const rect = frame.getBoundingClientRect();
      const [x, y, w, h] = state.crop;
      const anchor: [number, number] = [
        x + ((event.clientX - rect.left) / Math.max(1, rect.width)) * w,
        y + ((event.clientY - rect.top) / Math.max(1, rect.height)) * h,
      ];
      const zoom = cropZoom(state.ratio, state.crop, state.size) * Math.exp(-event.deltaY * 0.002);
      const next = zoomCrop(state.ratio, state.crop, zoom, state.size, anchor);
      latest.current = { ...state, crop: next };
      state.onChange(next);
    };
    frame.addEventListener("wheel", onWheel, { passive: false });
    return () => frame.removeEventListener("wheel", onWheel);
  }, []);

  const distance = () => {
    const [a, b] = [...pointers.current.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled || (event.pointerType === "mouse" && event.button !== 0)) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2) {
      pinch.current = { distance: distance(), zoom: cropZoom(ratio, crop, size) };
    }
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const last = pointers.current.get(event.pointerId);
    if (!last) return;
    const point = { x: event.clientX, y: event.clientY };
    pointers.current.set(event.pointerId, point);
    const state = latest.current;
    if (pointers.current.size >= 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const start = pinch.current;
      const now = distance();
      if (!a || !b || start.distance <= 0 || now <= 0) return;
      const anchor = photoPoint((a.x + b.x) / 2, (a.y + b.y) / 2);
      emit(
        zoomCrop(state.ratio, state.crop, (start.zoom * now) / start.distance, state.size, anchor),
      );
      return;
    }
    const rect = frameRef.current!.getBoundingClientRect();
    const [, , w, h] = state.crop;
    // Dragging the photo right shows more of its left: the crop moves the other way.
    const dx = (-(point.x - last.x) / Math.max(1, rect.width)) * w;
    const dy = (-(point.y - last.y) / Math.max(1, rect.height)) * h;
    if (dx !== 0 || dy !== 0) emit(moveCrop(state.ratio, state.crop, dx, dy, state.size));
  };

  const onPointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const step = event.shiftKey ? KEY_STEP * 5 : KEY_STEP;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const move = moves[event.key];
    if (move) {
      event.preventDefault();
      emit(moveCrop(ratio, crop, move[0], move[1], size));
      return;
    }
    const zoom = cropZoom(ratio, crop, size);
    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      emit(zoomCrop(ratio, crop, zoom * ZOOM_STEP, size));
    } else if (event.key === "-" || event.key === "_") {
      event.preventDefault();
      emit(zoomCrop(ratio, crop, zoom / ZOOM_STEP, size));
    }
  };

  const [x, y, w, h] = crop;
  const zoom = cropZoom(ratio, crop, size);
  const maxZoom = maxCropZoom(ratio, size);
  const percent = Math.round(zoom * 100);

  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      <div
        ref={frameRef}
        role="group"
        tabIndex={disabled ? -1 : 0}
        aria-label={label}
        aria-describedby={[hintId, describedBy].filter(Boolean).join(" ")}
        aria-disabled={disabled || undefined}
        data-crop={crop.map((value) => value.toFixed(4)).join(",")}
        data-invalid={invalid ? "true" : undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onKeyDown={onKeyDown}
        style={{ aspectRatio: String(ratio) }}
        className={cn(
          "relative w-full touch-none overflow-hidden rounded-md bg-image-well outline-none select-none",
          "focus-visible:ring-2 focus-visible:ring-gold-ink focus-visible:ring-offset-2",
          disabled ? "opacity-60" : "cursor-grab active:cursor-grabbing",
          invalid && "ring-[1.5px] ring-danger/70",
        )}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute"
          style={{
            width: `${100 / w}%`,
            height: `${100 / h}%`,
            left: `${(-x / w) * 100}%`,
            top: `${(-y / h) * 100}%`,
          }}
        >
          {src ? (
            <Image
              src={src}
              alt=""
              fill
              sizes="1200px"
              draggable={false}
              className="object-fill media-dim"
            />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center bg-gold-soft">
              {placeholder}
            </span>
          )}
        </div>
        {/* Thirds, to help placing the product. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 [background-image:linear-gradient(to_right,transparent_calc(33.33%-0.5px),rgb(255_255_255/0.45)_calc(33.33%-0.5px),rgb(255_255_255/0.45)_calc(33.33%+0.5px),transparent_calc(33.33%+0.5px),transparent_calc(66.66%-0.5px),rgb(255_255_255/0.45)_calc(66.66%-0.5px),rgb(255_255_255/0.45)_calc(66.66%+0.5px),transparent_calc(66.66%+0.5px)),linear-gradient(to_bottom,transparent_calc(33.33%-0.5px),rgb(255_255_255/0.45)_calc(33.33%-0.5px),rgb(255_255_255/0.45)_calc(33.33%+0.5px),transparent_calc(33.33%+0.5px),transparent_calc(66.66%-0.5px),rgb(255_255_255/0.45)_calc(66.66%-0.5px),rgb(255_255_255/0.45)_calc(66.66%+0.5px),transparent_calc(66.66%+0.5px))]"
        />
        <span id={hintId} className="sr-only">
          {hint}
        </span>
      </div>
      <input
        type="range"
        min={1}
        max={Math.max(1, Number(maxZoom.toFixed(2)))}
        step={0.01}
        value={Math.min(zoom, maxZoom)}
        disabled={disabled || maxZoom <= 1}
        aria-label={zoomLabel}
        aria-valuetext={zoomText(percent)}
        onChange={(event) => onChange(zoomCrop(ratio, crop, Number(event.target.value), size))}
        className="w-full accent-gold-ink"
      />
    </div>
  );
}
