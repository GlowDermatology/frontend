import { cn } from "@/lib/cn";

import { Container } from "./layout-primitives";

/**
 * Loading states with the exact footprint of what replaces them (4:5 image
 * frames, one line per text row), so nothing moves when the content
 * streams in. Hidden from assistive technology; the region is `aria-busy`.
 */

function Bar({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("block skeleton rounded-sm", className)} />;
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <ul
      aria-hidden="true"
      className="m-0 grid list-none grid-cols-2 gap-x-[clamp(12px,2vw,24px)] gap-y-[clamp(28px,3vw,44px)] p-0 sm:grid-cols-3 nav:grid-cols-4"
    >
      {Array.from({ length: count }, (_, index) => (
        <li key={index} className="flex flex-col gap-4">
          <span className="block aspect-product w-full skeleton rounded-lg" />
          <span className="flex flex-col gap-2 px-0.5">
            <Bar className="h-6 w-16" />
            <Bar className="h-5 w-4/5" />
            <Bar className="h-4 w-1/3" />
            <Bar className="mt-1 h-5 w-1/2" />
          </span>
        </li>
      ))}
    </ul>
  );
}

export function PageHeadingSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex flex-col gap-5 pt-[clamp(32px,5vw,72px)] pb-[clamp(24px,3vw,40px)]"
    >
      <Bar className="h-3.5 w-32" />
      <Bar className="h-[clamp(36px,4vw,56px)] w-2/3 max-w-[520px]" />
      <Bar className="h-5 w-full max-w-[560px]" />
    </div>
  );
}

/** Generic page body: heading plus a product grid (catalog, category). */
export function CatalogSkeleton() {
  return (
    <Container className="pb-24">
      <div aria-busy="true">
        <PageHeadingSkeleton />
        <Bar className="mb-10 h-12 w-full max-w-[560px] rounded-md" />
        <ProductGridSkeleton />
      </div>
    </Container>
  );
}

export function ProductSkeleton() {
  return (
    <Container className="pb-24">
      <div
        aria-busy="true"
        className="grid gap-[clamp(32px,5vw,80px)] pt-10 nav:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]"
      >
        <span className="block aspect-product w-full skeleton rounded-lg" />
        <div className="flex flex-col gap-5 pt-4">
          <Bar className="h-4 w-40" />
          <Bar className="h-14 w-4/5" />
          <Bar className="h-5 w-1/3" />
          <Bar className="h-9 w-1/2" />
          <Bar className="mt-4 h-14 w-full max-w-[360px] rounded-md" />
          <Bar className="mt-6 h-4 w-full" />
          <Bar className="h-4 w-11/12" />
          <Bar className="h-4 w-3/4" />
        </div>
      </div>
    </Container>
  );
}

export function CardsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <Container className="pb-24">
      <div aria-busy="true">
        <PageHeadingSkeleton />
        <ul
          aria-hidden="true"
          className="m-0 grid list-none gap-6 p-0 sm:grid-cols-2 nav:grid-cols-3"
        >
          {Array.from({ length: count }, (_, index) => (
            <li
              key={index}
              className="flex flex-col gap-4 rounded-lg border border-line bg-surface-raised p-6"
            >
              <span className="block size-20 skeleton rounded-full" />
              <Bar className="h-7 w-2/3" />
              <Bar className="h-4 w-1/3" />
              <Bar className="h-4 w-full" />
            </li>
          ))}
        </ul>
      </div>
    </Container>
  );
}

export function ProseSkeleton() {
  return (
    <Container className="pb-24">
      <div aria-busy="true" className="max-w-prose">
        <PageHeadingSkeleton />
        <div aria-hidden="true" className="flex flex-col gap-3">
          {Array.from({ length: 8 }, (_, index) => (
            <Bar key={index} className={cn("h-4", index % 3 === 2 ? "w-2/3" : "w-full")} />
          ))}
        </div>
      </div>
    </Container>
  );
}

/** Home: hero, then a grid. */
export function HomeSkeleton() {
  return (
    <div aria-busy="true">
      <Container>
        <span
          aria-hidden="true"
          className="mt-6 block h-[clamp(420px,56vw,640px)] w-full skeleton rounded-lg"
        />
        <div className="py-16">
          <ProductGridSkeleton count={4} />
        </div>
      </Container>
    </div>
  );
}

/**
 * A specialist page: breadcrumbs, then the portrait column (200px portrait,
 * role, name, booking button) beside the about/services column (U5).
 */
export function SpecialistSkeleton() {
  return (
    <Container className="pb-[clamp(64px,8vw,120px)]">
      <div aria-busy="true">
        <div aria-hidden="true" className="flex gap-2 pt-6">
          <Bar className="h-5 w-24" />
          <Bar className="h-5 w-32" />
        </div>
        <div
          aria-hidden="true"
          className="grid gap-[clamp(32px,5vw,80px)] pt-10 nav:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]"
        >
          <div className="flex flex-col items-start gap-6">
            <span className="block size-[200px] skeleton rounded-full" />
            <div className="flex w-full flex-col gap-2">
              <Bar className="h-3.5 w-28" />
              <Bar className="h-10 w-3/4" />
              <Bar className="h-5 w-40" />
            </div>
            <Bar className="h-13 w-48 rounded-md" />
            <div className="flex w-full flex-col gap-2 border-t border-line pt-5">
              <Bar className="h-3.5 w-24" />
              <Bar className="h-5 w-1/2" />
              <Bar className="h-5 w-2/3" />
            </div>
          </div>
          <div className="flex flex-col gap-10">
            <div className="flex flex-col gap-3">
              <Bar className="h-8 w-40" />
              {Array.from({ length: 5 }, (_, index) => (
                <Bar key={index} className={cn("h-6", index === 4 ? "w-2/3" : "w-full")} />
              ))}
            </div>
            <div className="flex flex-col gap-3">
              <Bar className="h-8 w-48" />
              {Array.from({ length: 4 }, (_, index) => (
                <Bar key={index} className="h-12 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
}
