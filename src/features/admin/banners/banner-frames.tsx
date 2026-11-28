import Image from "next/image";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

/**
 * A banner picture in the two frames customers see it in, drawn like the real ones so staff
 * judge the result before saving:
 *
 * - **App** (mobile `banner_carousel.dart`): 2.15:1, the whole picture (`cover` of a 2.15:1
 *   image), a dark gradient from 30 % of the height and the title (up to three lines) 30 px
 *   above the bottom across the width of a ~358 px phone banner.
 * - **Website** (`home.tsx` `BannerFrame`): 2:1 (`aspect-banner`), the picture's middle
 *   (`cover`), the title band at the bottom with the gold arrow on the right.
 *
 * Sizes follow the frame's width (container query units of the wrapper), so a small preview keeps
 * the real proportions of text to picture.
 */

interface FrameProps {
  src: string;
  title: string;
  /** Shown (muted) instead of an empty title. */
  placeholder: string;
  className?: string;
}

export function AppBannerFrame({ src, title, placeholder, className }: FrameProps) {
  return (
    <span className={cn("@container block w-full", className)}>
      <span
        data-banner-frame="app"
        className="relative block aspect-[2.15/1] w-full overflow-hidden rounded-[4.5cqw] bg-banner"
      >
        <Image src={src} alt="" fill sizes="360px" className="object-cover" />
        <span
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(to_bottom,rgb(43_38_32/0)_30%,rgb(43_38_32/0.85)_100%)]"
        />
        <span
          className={cn(
            "absolute inset-x-[5.6cqw] bottom-[8.4cqw] line-clamp-3 font-serif text-[7.3cqw] leading-[1.1] font-semibold",
            title ? "text-banner-ink" : "text-banner-ink/55",
          )}
        >
          {title || placeholder}
        </span>
      </span>
    </span>
  );
}

export function WebBannerFrame({ src, title, placeholder, className }: FrameProps) {
  return (
    <span className={cn("@container block w-full", className)}>
      <span
        data-banner-frame="web"
        className="relative block aspect-banner w-full overflow-hidden rounded-[2cqw] border border-nav-line bg-banner"
      >
        <Image src={src} alt="" fill sizes="520px" className="object-cover" />
        <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-[2.6cqw] bg-linear-to-t from-banner/85 to-transparent p-[5.2cqw] pt-[12.9cqw]">
          <span
            className={cn(
              "font-serif text-[5.5cqw] leading-[1.1] font-semibold",
              title ? "text-banner-ink-soft" : "text-banner-ink-soft/55",
            )}
          >
            {title || placeholder}
          </span>
          <span
            aria-hidden="true"
            className="flex size-[7.1cqw] shrink-0 items-center justify-center rounded-full bg-gold text-on-gold"
          >
            <Icon name="arrow-right" size={16} />
          </span>
        </span>
      </span>
    </span>
  );
}
