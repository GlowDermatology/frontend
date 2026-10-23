import { Rings } from "@/components/brand/rings";
import { buttonStyles } from "@/components/ui/button";

/** Branded 404 content, shared by the global and per-layout not-found pages. */
export function NotFoundView() {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-banner px-6 py-16">
      <Rings
        viewBox={800}
        rings={[
          [120, 0.5],
          [190, 0.34],
          [260, 0.22],
          [330, 0.13],
          [395, 0.07],
        ]}
        className="absolute top-1/2 left-1/2 size-[900px] -translate-x-1/2 -translate-y-1/2"
      />
      <div className="relative flex max-w-[460px] flex-col items-center gap-5 text-center">
        <p className="m-0 font-serif text-[96px] leading-none font-semibold text-banner-ink">404</p>
        <h1 className="m-0 font-serif text-[34px] leading-10 font-semibold text-banner-ink">
          Sahifa topilmadi
        </h1>
        <p className="m-0 text-[17px] leading-7 text-banner-ink-soft">
          Havola eskirgan yoki manzil noto‘g‘ri yozilgan bo‘lishi mumkin.
        </p>
        <a href="/" className={buttonStyles({ size: "lg", lift: true })}>
          Bosh sahifaga qaytish
        </a>
      </div>
    </main>
  );
}
