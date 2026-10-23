import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge only knows Tailwind's default scales. The design system
 * replaces font sizes, radii and shadows with its own names, so register them;
 * otherwise `text-label` would be read as a colour and dropped next to
 * `text-ink`.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: [
        "display",
        "title",
        "heading",
        "subheading",
        "body",
        "body-sm",
        "label",
        "caption",
        "overline",
        "price",
        "price-lg",
      ],
      radius: ["sm", "md", "lg"],
      shadow: ["sm", "lg"],
    },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
