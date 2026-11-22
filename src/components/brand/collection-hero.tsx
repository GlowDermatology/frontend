import Image from "next/image";
import type { ReactNode } from "react";

export function CollectionHero({ children }: { children: ReactNode }) {
  return (
    <section
      aria-labelledby="hero-title"
      className="mx-auto grid w-full max-w-[1440px] items-center gap-[clamp(28px,4vw,64px)] px-[clamp(16px,4vw,56px)] py-[clamp(36px,5vw,84px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]"
    >
      <div className="flex min-w-0 flex-col items-start gap-[clamp(16px,2vw,28px)]">{children}</div>
      <Image
        src="/glow-derma-collection.webp"
        alt=""
        width={1376}
        height={768}
        preload
        sizes="(min-width: 1440px) 675px, (min-width: 1024px) 48vw, 94vw"
        className="block h-auto w-full rounded-[clamp(16px,2vw,30px)] shadow-card"
      />
    </section>
  );
}
