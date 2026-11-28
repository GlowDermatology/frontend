"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/cn";

/** Wide enough for a sharp preview on a 2x screen; a phone photo is scaled down to this. */
const PREVIEW_MAX_WIDTH = 960;

interface PickedImageProps {
  /** The picture the admin has just picked, before it is uploaded. */
  file: File;
  /** What the picture is, for screen readers (the canvas is `role="img"`). */
  label: string;
  className?: string;
}

/**
 * A picked picture shown before upload. The file is decoded straight onto a canvas (`object-fit`
 * works on a canvas as on an `<img>`), so no URL made from the file reaches the DOM and there is
 * nothing to revoke. A file the browser cannot decode leaves the canvas empty; the server's own
 * check then explains the problem on save.
 */
export function PickedImage({ file, label, className }: PickedImageProps) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let current = true;
    createImageBitmap(file)
      .then((bitmap) => {
        const target = canvas.current;
        if (current && target) {
          const width = Math.min(bitmap.width, PREVIEW_MAX_WIDTH);
          const height = Math.round((bitmap.height * width) / bitmap.width);
          target.width = width;
          target.height = height;
          target.getContext("2d")?.drawImage(bitmap, 0, 0, width, height);
        }
        bitmap.close();
      })
      .catch(() => undefined);
    return () => {
      current = false;
    };
  }, [file]);

  return (
    <canvas
      ref={canvas}
      role="img"
      aria-label={label}
      data-picked-image=""
      className={cn("size-full object-cover", className)}
    />
  );
}
